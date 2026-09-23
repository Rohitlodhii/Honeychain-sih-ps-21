# HoneyChain Backend — Routes Reference

**Framework:** FastAPI (`backend/app/main.py`)
**Base title:** `HoneyChain API v1.0.0`
**DB:** SQLAlchemy (`User`, `Hive`, `SensorReading`, `Batch`, `LedgerBlock`) via `backend/app/database.py`
**Auth:** JWT Bearer (`HS256`, 24h expiry) via `backend/app/auth.py` + `get_current_user()` dependency in `main.py:99-118`
**Ledger:** Hash-chained + PoW (2 leading zeros) via `backend/app/ledger.py` (`HoneyLedger`), persisted in `ledger_blocks` table. Rebuilt per-request by `persisted_ledger()` (`main.py:58-77`).
**Analytics:** Rule engine via `backend/app/analytics.py` (`ApicultureAnalytics`) — hive health (33–36°C, 50–65% RH, 180–260 Hz), productivity trend, purity screening (BIS/Codex ≤20% moisture).
**CORS:** `allow_origins=cors_origins()` (default `http://localhost:3000`), `allow_methods=["GET","POST"]`, `allow_headers=["Authorization","Content-Type"]` (`main.py:44-50`).
**Startup:** `startup()` (`main.py:771-778`) validates `SECRET_KEY` + `FRONTEND_URL` and calls `init_db()` (creates tables).

Auth convention: all routes below require `Authorization: Bearer <JWT>` unless marked **Public** or **Twilio-signed**.

---

## 1. System

### `GET /health`
**File:** `main.py:53-56` | **Auth:** None (public)
**What it does:**
1. Returns `{"status":"ok"}`.
2. Used as Docker / hosting platform liveness probe. No DB access, no side effects.

---

## 2. Auth

### `POST /api/auth/register`
**File:** `main.py:125-141` | **Auth:** None | **Body:** `UserRegisterRequest` (`schemas.py:11-19`) — `name, phone, password, role=("beekeeper"|"cooperative_admin"), cluster?, email?, admin_invite_code?`
**What it does:**
1. Calls `AuthService.register_user()` (`auth.py:64-98`).
2. If `role == "cooperative_admin"`, requires `admin_invite_code` to match `ADMIN_INVITE_CODE` env var, else `ValueError` → `400`.
3. Rejects duplicate `phone` → `400 "Phone number already registered"`.
4. bcrypt-hashes password (`pwd_context`), creates `User(id=uuid4)` row, commits.
5. Returns `UserResponse` (no token — client must call login next).
**Errors:** `400` on duplicate phone / bad invite code.

### `POST /api/auth/login`
**File:** `main.py:144-155` | **Auth:** None | **Body:** `UserLoginRequest` — `phone, password`
**What it does:**
1. Calls `AuthService.authenticate_user()` (`auth.py:101-112`): lookup by `phone`, bcrypt verify.
2. Returns `401 "Invalid phone or password"` if no match.
3. Creates JWT `{"sub": user.id, "exp": +24h}` via `create_access_token()` (`auth.py:36-50`) signed with `SECRET_KEY`.
4. Returns `TokenResponse {access_token, token_type:"bearer", user}`.

### `GET /api/auth/me`
**File:** `main.py:158-161` | **Auth:** Required
**What it does:**
1. `get_current_user()` parses `Authorization: Bearer <token>`, calls `get_user_from_token()` (decode JWT → `User` row). `401` on missing/malformed/expired token.
2. Returns current `UserResponse` profile.

---

## 3. Hives + Sensors

### `POST /api/hives`
**File:** `main.py:168-187` | **Auth:** Required | **Body:** `HiveCreateRequest` — `name, location, species, latitude?, longitude?`
**What it does:**
1. Creates `Hive(id=uuid4, beekeeper_id=current_user.id, ...)` row.
2. Commits and returns `HiveResponse`.

### `GET /api/hives`
**File:** `main.py:190-197` | **Auth:** Required
**What it does:**
1. Queries `Hive WHERE beekeeper_id == current_user.id`.
2. Returns `List[HiveResponse]` (only own hives; admins see only their own too).

### `GET /api/hives/{hive_id}/readings`
**File:** `main.py:200-215` | **Auth:** Required
**What it does:**
1. Verifies `Hive(id, beekeeper_id=current_user.id)` exists, else `404 "Hive not found"` (also enforces ownership).
2. Fetches up to 100 `SensorReading WHERE hive_id`, ordered `recorded_at DESC`.
3. Returns `List[SensorReadingResponse]`.

### `POST /api/hives/{hive_id}/readings`
**File:** `main.py:275-289` | **Auth:** Required | **Body:** `SensorReadingCreateRequest` — `temperature_c, humidity_pct (0-100), weight_kg (≥0), sound_hz?, recorded_at?`
**What it does:**
1. Verifies hive ownership, else `404`.
2. Calls shared helper `save_sensor_reading()` (`main.py:80-92`): inserts `SensorReading(id=uuid4, recorded_at=now if omitted)`, commits. **No values are generated — only persists what client measured.**
3. Returns the created `SensorReadingResponse`.

### `GET /api/hives/{hive_id}/health`
**File:** `main.py:218-272` | **Auth:** Required
**What it does:**
1. Verifies hive ownership, else `404`.
2. Loads latest `SensorReading` for hive; `404 "No sensor readings"` if none.
3. Calls `ApicultureAnalytics.analyze_hive_health(temp, humidity, sound, weight)` → `{status: HEALTHY|WATCH|HIGH_RISK, confidence, reasons, metrics}`.
4. Loads **all** weights + dates for hive (ordered ASC); if >1 reading calls `predict_productivity(weights, dates)` → `{yield_estimate_kg, trend, confidence, next_harvest_days, recommendation}`, else returns `insufficient_data` stub.
5. Returns `{hive_id, health:{status,confidence,reasons,metrics}, productivity:{...}, latest_reading}` (typed as `dict`, not a strict schema).

### `POST /api/hives/{hive_id}/simulate?anomaly=false`
**File:** `main.py:292-356` | **Auth:** Required | **Dev-only** (returns `404` if `APP_ENV=production`)
**What it does:**
1. Verifies hive ownership.
2. Generates + inserts **5 fake readings** (random around 34.5°C / 58% / 25kg / 220Hz). If `?anomaly=true`, reading #3 is forced anomalous (28.5°C, 72%, 150Hz) and `anomaly_detected=true`.
3. Runs `analyze_hive_health()` on the last generated reading.
4. Returns `SimulationResponse {hive_id, readings[5], health_status, anomaly_detected, message}`. Demo/testing helper only.

---

## 4. SMS / Offline Intake (Twilio)

Shared helpers: `sms_reply()` (`main.py:359-361`) returns TwiML XML; `ingest_sms_reading(from_phone, body, db)` (`main.py:364-389`) parses + saves + diagnoses.

### `POST /api/sms/webhook`
**File:** `main.py:392-402` | **Auth:** Twilio signature, not JWT. Expects `application/x-www-form-urlencoded` with `From, Body`.
**What it does:**
1. Reads all form params; calls `validate_twilio_signature(X-Twilio-Signature, url, params)` (`config.py:60-75`) — bypassed in dev, HMAC-SHA1 checked in production. `403` on invalid signature.
2. Requires `From` + `Body`, else `422`.
3. Delegates to `ingest_sms_reading()` (see below). Returns TwiML `<Response><Message>…</Message></Response>`.

### `POST /api/sms/simulate`
**File:** `main.py:405-413` | **Auth:** None (form fields `from_phone, body`) | **Dev-only** (`404` in production)
**What it does:**
1. Same as webhook but takes explicit form fields and skips signature check. Dev tool for testing SMS parsing without Twilio.

**`ingest_sms_reading()` logic (both SMS routes):**
1. Regex-parses `"<HIVE_CODE> TEMP <n> HUM <n> [SOUND <n>]"` (case-insensitive). On mismatch → TwiML `"Format: HIVE1 TEMP 34 HUM 55 [SOUND 220]"`.
2. Looks up `Hive JOIN User WHERE User.phone == From AND lower(Hive.name) == hive_code`. No match → `"Hive code not found for this phone number."`.
3. Requires at least one prior app reading (to reuse a known `weight_kg` since SMS has no scale) — else `"Record one reading with weight in the app before SMS intake."`.
4. Saves reading via `save_sensor_reading()` reusing latest weight, runs `analyze_hive_health()`, replies TwiML `"<hive>: <STATUS>. <first reason>"`.

---

## 5. Batches (Honey Lots) + Ledger

### `POST /api/batches`
**File:** `main.py:420-493` | **Auth:** Required | **Body:** `BatchCreateRequest` — `hive_id, honey_type, quantity_kg, apiary_location, moisture_pct (0-100)`
**What it does:**
1. Verifies `hive_id` belongs to caller, else `404`.
2. Calls `ApicultureAnalytics.score_purity(moisture_pct)` → `{purity_score 0-100, status PASS|CAUTION|REJECT}`.
3. Inserts `Batch(id=uuid4, beekeeper_id, hive_id, harvest_date=now, purity_score, status="HARVESTED", current_owner=user.id)`.
4. Appends `HARVEST` block: rebuilds ledger via `persisted_ledger(db)`, calls `append_event(batch_id, "HARVEST", {quantity_kg, honey_type, apiary_location, moisture_pct, purity_score}, actor=user.id)` (PoW mining included), then persists the block as a `LedgerBlock` row (`index, batch_id, event_type, payload, actor, timestamp_str, prev_hash, hash, nonce`).
5. Returns `{batch_id, status, verify_url:"/verify/<id>" (relative), purity_score, purity_status}`.

### `GET /api/batches`
**File:** `main.py:496-503` | **Auth:** Required
**What it does:**
1. Returns all `Batch WHERE beekeeper_id == current_user.id` as `List[BatchResponse]`.

### `POST /api/batches/{batch_id}/events`
**File:** `main.py:506-560` | **Auth:** Required | **Body:** `BatchEventRequest` — `event_type (QUALITY_TEST|TRANSFER|PACKAGE|SALE), payload: dict`
**What it does:**
1. Verifies batch ownership, else `404`.
2. Maps event → status: `QUALITY_TEST→QUALITY_TEST, TRANSFER→TRANSFERRED, PACKAGE→PACKAGED, SALE→SOLD`; updates `batch.current_owner = payload["new_owner"]` if present.
3. Appends ledger block with same `persisted_ledger(db).append_event(...)` flow and stores `LedgerBlock` row.
4. Returns `{batch_id, status, event}`.

### `GET /api/batches/{batch_id}/qr`
**File:** `main.py:563-592` | **Auth:** None (public — needed for printing/sharing)
**What it does:**
1. Looks up `Batch(id)`, else `404`.
2. Builds `verify_url = {FRONTEND_URL}/verify/{batch_id}` (absolute, e.g. `http://localhost:3000/verify/...` in dev).
3. Generates PNG QR (`qrcode` lib, box_size 10, border 2) encoding that URL, streams back as `image/png`.

### `GET /api/batches/{batch_id}/compliance-report`
**File:** `main.py:595-628` | **Auth:** Required (owner only)
**What it does:**
1. Verifies batch ownership, else `404`.
2. Loads ordered `LedgerBlock`s for batch; recomputes `score_purity(batch.moisture_pct)`.
3. Builds A4 PDF in-memory (`reportlab`): title, batch ID, honey type, quantity, `Moisture: X% | BIS/Codex <=20%: COMPLIANT/NOT COMPLIANT`, purity screening line, then `Ledger timeline (event | hash)` one line per block. Paginates as needed.
4. Streams `application/pdf` with `Content-Disposition: attachment; filename="honeychain-<id>-compliance.pdf"`. Screening-only report, not lab certification.

---

## 6. Public Verification (Consumer)

### `GET /api/verify/{batch_id}`
**File:** `main.py:635-673` | **Auth:** None (public — scanned from QR)
**What it does:**
1. Looks up `Batch(id)`, else `404`. Loads beekeeper `User` for name/cluster.
2. Loads all `LedgerBlock WHERE batch_id` ordered by `index` → `ledger_timeline`.
3. Runs `persisted_ledger(db).verify_chain()` over the **whole** chain (recompute hashes + check `prev_hash` links) → `{valid, errors, first_tampering_at_index, total_blocks}`.
4. `authenticity_badge = "VERIFIED" if valid else "TAMPERED"`.
5. Counts `TRANSFER` events → `transfer_count`; `direct_trade = transfer_count <= 1`.
6. Returns `VerifyBatchResponse {batch_id, beekeeper_name, beekeeper_cluster, honey_type, quantity_kg, harvest_date, apiary_location, moisture_pct, purity_score, status, ledger_timeline[], chain_verification, authenticity_badge, transfer_count, direct_trade}`.

---

## 7. Admin (KVIC Cooperative)

### `GET /api/admin/overview`
**File:** `main.py:680-764` | **Auth:** Required + `role == "cooperative_admin"` else `403`
**What it does (all computed live, nothing cached):**
1. Counts: `total_beekeepers` (`User WHERE role=beekeeper`), `total_hives`, `total_batches`, `total_honey_kg` (`SUM(quantity_kg)`).
2. `batches_by_status` — `GROUP BY Batch.status`.
3. `batches_by_cluster` — `JOIN User→Batch GROUP BY User.cluster` (null clusters excluded).
4. `avg_purity_score` — `AVG(Batch.purity_score)` rounded to 1dp.
5. `avg_hive_health_status {HEALTHY, WATCH, HIGH_RISK}` — takes each hive's **latest** real `SensorReading` (hives with zero readings excluded), runs `analyze_hive_health()` per hive, tallies.
6. `ledger_integrity` — full `verify_chain()` report.
7. `reputation_leaderboard[]` per distinct `cluster`: `{cluster, batch_count, avg_purity, tamper_incidents, score}` where `score = clamp(0..100, avg_purity*0.7 + min(batch_count,10)*3 − tamper_incidents*10)`. Tamper = blocks whose stored `hash != recompute`. Sorted desc by `score`.
8. Returns `AdminOverviewResponse`.

---

## 8. Internal Helpers (not HTTP routes)

| Helper | Location | Purpose |
|---|---|---|
| `get_current_user()` | `main.py:99-118` | Parses `Authorization: Bearer`, validates JWT, loads `User`. `401` on any failure. Injected via `Depends` into every authed route. |
| `persisted_ledger(db)` | `main.py:58-77` | Loads all `LedgerBlock` rows ordered by `index`, rebuilds `HoneyLedger` via `from_dict()`. Returns empty ledger (genesis only) if no rows. Guarantees restart-safe verification. |
| `save_sensor_reading()` | `main.py:80-92` | Single write path for API + SMS intake. Inserts + commits + refreshes `SensorReading`. |
| `sms_reply() / ingest_sms_reading()` | `main.py:359-389` | TwiML formatting + SMS parse/lookup/save/diagnose pipeline (see §4). |
| `HoneyLedger.append_event()` | `ledger.py:93-121` | Sets `index = prev.index+1`, `prev_hash = prev.hash`, mines PoW nonce (hash must start with `00`), appends. |
| `HoneyLedger.verify_chain()` | `ledger.py:127-162` | Recomputes every hash, checks link integrity. Returns `{valid, first_tampering_at_index, errors, total_blocks}`. |
| `ApicultureAnalytics.*` | `analytics.py` | `analyze_hive_health()`, `predict_productivity()`, `score_purity()` — pure functions, no DB. |
| `validate_twilio_signature()` | `config.py:60-75` | Dev = always true; prod = HMAC-SHA1 over `TWILIO_WEBHOOK_URL + sorted(params)` vs `X-Twilio-Signature`. |
| `development_only_features_enabled()` | `config.py:55-57` | `APP_ENV != "production"`. Gates `/simulate` and `/sms/simulate`. |

---

## 9. Quick Matrix

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Liveness probe |
| POST | `/api/auth/register` | Public | Create beekeeper/admin account |
| POST | `/api/auth/login` | Public | Login → JWT |
| GET | `/api/auth/me` | JWT | Own profile |
| POST | `/api/hives` | JWT | Create hive |
| GET | `/api/hives` | JWT | List own hives |
| GET | `/api/hives/{id}/readings` | JWT (owner) | Last 100 readings |
| POST | `/api/hives/{id}/readings` | JWT (owner) | Save manual reading |
| GET | `/api/hives/{id}/health` | JWT (owner) | Health diagnosis + yield forecast |
| POST | `/api/hives/{id}/simulate` | JWT (owner, dev-only) | Generate 5 fake readings |
| POST | `/api/sms/webhook` | Twilio sig | SMS sensor intake |
| POST | `/api/sms/simulate` | None (dev-only) | Fake SMS intake |
| POST | `/api/batches` | JWT | Harvest batch + HARVEST ledger block |
| GET | `/api/batches` | JWT | List own batches |
| POST | `/api/batches/{id}/events` | JWT (owner) | Append QUALITY_TEST/TRANSFER/PACKAGE/SALE |
| GET | `/api/batches/{id}/qr` | Public | PNG QR → frontend verify URL |
| GET | `/api/batches/{id}/compliance-report` | JWT (owner) | PDF screening report |
| GET | `/api/verify/{id}` | Public | Consumer traceability + VERIFIED/TAMPERED badge |
| GET | `/api/admin/overview` | JWT + `cooperative_admin` | KVIC stats, health tally, reputation leaderboard |
