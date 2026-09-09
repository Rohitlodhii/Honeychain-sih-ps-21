# HoneyChain: Blockchain-Based Honey Traceability & Smart Beekeeping

A full-stack solution for KVIC's Honey Mission. Verify honey authenticity via QR codes backed by a tamper-proof ledger. Monitor hive health with AI analytics. Built for rural beekeepers and cooperative admins.

## 🎯 Problem & Solution

**Problem:** Counterfeit honey erodes consumer trust and exploits honest beekeepers. No traceability. Beekeepers lack hive health insights.

**Solution:**
- QR-code batch verification backed by a real, from-scratch SHA-256 hash-chained ledger
- AI/IoT hive monitoring (temperature, humidity, acoustics) to detect disease & predict yield
- Simple touch-friendly UI for rural beekeepers (large buttons, Hindi-ready labels)
- KVIC cooperative admin dashboard for cluster-level supply & quality tracking
- Fully offline-capable; sync when connected

---

## 🛠️ Tech Stack

- **Backend:** FastAPI (Python 3.11), SQLAlchemy, SQLite (dev) / Postgres (prod)
- **Ledger:** Custom hash-chained ledger (SHA-256, proof-of-work, permissioned design)
- **AI/IoT:** Rule-threshold engine with real apiculture ranges (brood 33–36°C, humidity 50–65%, acoustic 180–260 Hz)
- **Frontend:** Next.js 14 (App Router), Tailwind CSS, Recharts
- **Auth:** JWT (python-jose + passlib/bcrypt)
- **Deploy:** Docker + docker-compose (local), Render/Railway (backend), Vercel (frontend)

---

## 📦 Project Structure

```
Honey/
├── backend/
│   ├── main.py              # FastAPI app & routes
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic request/response models
│   ├── ledger.py            # Hash-chained ledger module
│   ├── analytics.py         # AI/IoT hive health & purity scoring
│   ├── auth.py              # JWT & password management
│   ├── database.py          # SQLAlchemy session & config
│   ├── requirements.txt      # Python dependencies
│   ├── Dockerfile           # Backend container
│   ├── .env.example         # Environment template
│   └── honey.db             # SQLite DB (generated at runtime)
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Landing page (hero + QR demo)
│   │   ├── login/           # Login/register page
│   │   ├── dashboard/       # Beekeeper dashboard (hives + batches)
│   │   ├── verify/[id]/     # Consumer verify page (trust-building moment)
│   │   ├── admin/           # Cooperative admin dashboard
│   │   └── globals.css      # Design system + Tailwind
│   ├── lib/
│   │   └── api.ts           # Axios API client
│   ├── package.json         # Node dependencies
│   ├── next.config.js       # Next.js config
│   ├── tailwind.config.js   # Design tokens (espresso, honey gold, sage, brick)
│   ├── postcss.config.js    # PostCSS plugins
│   ├── Dockerfile           # Frontend container
│   └── .env.example         # Environment template
│
├── docker-compose.yml       # Local dev: backend + frontend + optional Postgres
├── README.md                # This file
└── EXAMPLES.md              # Demo walkthrough & test scenarios
```

---

## 🚀 Quick Start (Local)

### Prerequisites
- Docker + Docker Compose
- OR: Python 3.11+, Node.js 18+, npm

### Option 1: Docker Compose (Fastest)

```bash
cd Honey
docker-compose up
```

Visit:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/docs (Swagger UI)

### Option 2: Manual Setup

**Backend:**
```bash
cd Honey/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env
cp .env.example .env
# Edit .env if needed

# Run server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd Honey/frontend

# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local
# Ensure NEXT_PUBLIC_API_URL=http://localhost:8000

# Run dev server
npm run dev
```

---

## 📱 Usage Flow (Demo Script)

### 1. **Register & Create Hive** (1 min)
- Go to http://localhost:3000/login?mode=register
- Sign up as "Beekeeper"
- Phone: +91 9876543210, Password: test123, Name: "Ram Bhaiya"
- Cluster: "Vidarbha"
- Click "Create Account"

### 2. **Create Hive & Monitor Health** (2 min)
- Dashboard auto-loads with option "+ Add Hive"
- Create: "Hive A", "Location: Forest North", Species: "Apis Mellifera"
- Click "Simulate Reading" → health diagnosis appears
- Try "Simulate Anomaly" to see disease detection (low temp + acoustic anomaly)

### 3. **Harvest & Create Batch** (1 min)
- Click "+ New Batch"
- Honey type: "Wildflower", Quantity: 25 kg, Location: "Forest North", Moisture: 18.5%
- Click "Create & Generate QR"
- System writes HARVEST block to ledger, calculates purity score

### 4. **Scan & Verify** (Consumer's perspective) (1 min)
- Download QR code from batch or scan with phone
- QR links to http://localhost:3000/verify/[batch_id]
- See: batch details, beekeeper name/cluster, purity score, full ledger timeline
- Authenticity badge: "VERIFIED" (all blocks valid)

### 5. **Tamper Test** (Advanced)
- Stop backend: `docker-compose down`
- Edit `honey.db` directly (sqlite3 CLI) to change a ledger hash
- Restart backend
- Refresh verify page → "TAMPERING DETECTED" badge appears

### 6. **KVIC Admin Dashboard** (Optional)
- Register as "Cooperative Admin"
- Go to `/admin` → see cluster-level stats, ledger integrity, hive health distribution

---

## 🔐 Ledger Design

The ledger is a **permissioned, tamper-evident audit log** for a KVIC cooperative. Each event (HARVEST, QUALITY_TEST, TRANSFER, PACKAGE, SALE) is a block:

```
Block {
  index: int
  batch_id: str
  event_type: "HARVEST" | "QUALITY_TEST" | "TRANSFER" | "PACKAGE" | "SALE"
  payload: {
    "quantity_kg": 25,
    "honey_type": "Wildflower",
    "apiary_location": "Forest North",
    "moisture_pct": 18.5,
    "purity_score": 95,
    ...
  }
  actor: beekeeper_id or admin_id
  timestamp: ISO 8601
  prev_hash: SHA-256 of previous block
  nonce: proof-of-work (2 leading zero hex chars)
  hash: SHA-256(index + batch_id + event_type + payload + actor + ts + prev_hash + nonce)
}
```

**Verification:** Walk all blocks, recompute hashes, check linkage. Any tampering breaks the chain.

**Why permissioned?** Beekeepers and QA labs are known to the network. No need for public consensus. Fast, offline-capable, zero gas fees.

---

## 🐝 AI/IoT Analytics

Real apiculture science thresholds:

### Hive Health Diagnosis
- **Temperature:** 33–36°C optimal (brood development). <28°C or >40°C = critical.
- **Humidity:** 50–65% optimal. <40% or >75% = alert.
- **Acoustic (worker bees):** 180–260 Hz healthy. Anomalies suggest disease or starvation.
- **Weight gain:** ≥0.5 kg/week = healthy foraging.

**Output:** `HEALTHY | WATCH | HIGH_RISK` + confidence + human-readable reasons.

### Honey Purity Scoring
- **Moisture:** ≤20% compliant (BIS/Codex). 18–20% flagged for lab confirmation.
- **Score:** 100 = excellent, 50–90 = caution, <50 = reject.
- **Note:** Screening tool, not lab replacement. Field moisture ~0.8× lab HMF correlation.

### Productivity Prediction
- Linear trend from historical weights
- Estimate yield in 5.5 weeks, flag forage shortage
- Confidence calibrated to data length

---

## 🌾 Design Tokens (Tailwind)

**Palette:**
- `espresso`: #171210 (deep charcoal base)
- `surface`: #241B14 (warm surface)
- `honey`: #E3A530 (gold primary)
- `amber`: #B6651D (deep secondary)
- `cream`: #F3E9D2 (light text)
- `sage`: #7C9473 (healthy states)
- `brick`: #B4523A (alerts)

**Typography:**
- Display: Fraunces (serif, warm, heritage)
- Body: Inter (clean, readable)

**Motif:**
- Honeycomb hexagons for batch/hive cards
- Ledger timeline as linked blocks (consumer verify page)

---

## 🔑 API Endpoints

### Auth
- `POST /api/auth/register` — Register beekeeper or admin
- `POST /api/auth/login` — Return JWT token
- `GET /api/auth/me` — Current user profile

### Hives
- `POST /api/hives` — Create hive
- `GET /api/hives` — List user's hives
- `GET /api/hives/{id}/readings` — Latest sensor readings
- `GET /api/hives/{id}/health` — Diagnosis + productivity
- `POST /api/hives/{id}/simulate?anomaly=false|true` — Generate 5 test readings

### Batches
- `POST /api/batches` — Create batch (harvest), auto-generates QR, writes HARVEST block
- `GET /api/batches` — List batches
- `POST /api/batches/{id}/events` — Add event (QUALITY_TEST, TRANSFER, PACKAGE, SALE)
- `GET /api/batches/{id}/qr` — Stream PNG QR code

### Verification (Public, No Auth)
- `GET /api/verify/{batch_id}` — Full timeline, purity, authenticity badge, ledger check

### Admin
- `GET /api/admin/overview` — Cluster stats, ledger integrity (admin-only)

---

## 📊 Database Models

### `User`
- id (UUID)
- name, phone (unique), email, role ("beekeeper" | "cooperative_admin")
- cluster, hashed_password

### `Hive`
- id, beekeeper_id (FK), name, location, species
- latitude, longitude

### `SensorReading`
- id, hive_id (FK), temperature_c, humidity_pct, weight_kg, sound_hz
- recorded_at

### `Batch`
- id, beekeeper_id (FK), hive_id (FK)
- honey_type, quantity_kg, harvest_date, apiary_location
- moisture_pct, purity_score, status, current_owner

### `LedgerBlock`
- id, index, batch_id (FK), event_type
- payload (JSON), actor, timestamp_str, prev_hash, hash, nonce

---

## 🚀 Production Deployment

### Backend (Render / Railway)

1. **Create GitHub repo & push code**
2. **Render (recommended for FastAPI):**
   - Connect repo
   - Create new "Web Service" from Dockerfile
   - Environment vars:
     ```
     DATABASE_URL=postgresql://user:pass@host/honeychain
     SECRET_KEY=<generate-random>
     CORS_ORIGINS=https://yourdomain.com
     FRONTEND_URL=https://yourdomain.com
     ```
   - Deploy

3. **Railway:**
   - Connect repo
   - Add "PostgreSQL" plugin
   - Set env vars from above
   - Deploy

### Frontend (Vercel)

1. **Vercel Dashboard → Import Project → Select GitHub repo**
2. **Root directory:** `frontend`
3. **Environment vars:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-domain.com
   ```
4. **Deploy**

### PostgreSQL Setup (Production)

Replace SQLite with:
```bash
pip install psycopg2-binary
# Set: DATABASE_URL=postgresql://user:password@db-host/honeychain
```

---

## 🧪 Testing & Verification

### 1. **Endpoint Tests (curl)**

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ram",
    "phone": "+919876543210",
    "password": "test123",
    "role": "beekeeper",
    "cluster": "Vidarbha"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "password": "test123"}'
# Copy access_token

# Get me
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/auth/me

# Create hive
curl -X POST http://localhost:8000/api/hives \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Hive A", "location": "Forest", "species": "apis_mellifera"}'

# Get hives
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/hives

# Get health
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/hives/{hive_id}/health

# Simulate readings
curl -X POST "http://localhost:8000/api/hives/{hive_id}/simulate?anomaly=false" \
  -H "Authorization: Bearer <TOKEN>"

# Create batch
curl -X POST http://localhost:8000/api/batches \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "hive_id": "{hive_id}",
    "honey_type": "Wildflower",
    "quantity_kg": 25,
    "apiary_location": "Forest North",
    "moisture_pct": 18.5
  }'

# Verify batch (public, no auth)
curl http://localhost:8000/api/verify/{batch_id}

# Admin overview
curl -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:8000/api/admin/overview
```

### 2. **Full Flow Test**

1. Register beekeeper + create hive
2. Simulate 5 readings (1 normal, 1 anomalous)
3. Check health diagnosis
4. Create batch → get QR
5. Verify as consumer → check ledger
6. Manually tamper with DB hash
7. Re-verify → "TAMPERING DETECTED"

---

## 📄 Environment Variables

### Backend (`.env`)
```
DATABASE_URL=sqlite:///./honey.db
SECRET_KEY=dev-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
FRONTEND_URL=http://localhost:3000
API_PORT=8000
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🎨 Design Philosophy

- **Rural-first:** Large touch targets, minimal text, language-agnostic (emoji + icons)
- **Trust-building:** Verify page is the hero moment—unforgeable hash chain visually prominent
- **Heritage:** Warm palette (espresso base, honey gold, amber) draws from apiculture & craftsmanship
- **Simple:** No dark-mode neon, no generic SaaS card kit. Genuine motifs (hexagons, linked blocks)

---

## 📖 File-by-File Guide

### Backend

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app, all routes (auth, hives, batches, verify, admin) |
| `ledger.py` | Hash-chained ledger + verification logic |
| `analytics.py` | Hive health diagnosis, purity scoring, yield prediction |
| `models.py` | SQLAlchemy ORM (User, Hive, SensorReading, Batch, LedgerBlock) |
| `schemas.py` | Pydantic models for API requests/responses |
| `auth.py` | JWT token creation/validation, password hashing |
| `database.py` | Session management, SQLAlchemy config |
| `requirements.txt` | Python dependencies |
| `Dockerfile` | Container image for backend |
| `.env.example` | Template for environment variables |

### Frontend

| File | Purpose |
|------|---------|
| `app/page.tsx` | Landing page (hero + live QR demo) |
| `app/login/page.tsx` | Login/register form |
| `app/dashboard/page.tsx` | Beekeeper hives + batches + health |
| `app/verify/[id]/page.tsx` | Consumer verification (trust moment) |
| `app/admin/page.tsx` | Cooperative dashboard (stats + ledger) |
| `app/globals.css` | Design system (Tailwind + custom utilities) |
| `app/layout.tsx` | Root layout + metadata |
| `lib/api.ts` | Axios client + endpoint wrappers |
| `tailwind.config.js` | Color tokens + typography |
| `package.json` | Node dependencies |
| `Dockerfile` | Container image for frontend |
| `.env.example` | Template for environment variables |

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 or 8000 already in use | `lsof -i :3000` / `lsof -i :8000`, kill process, or change ports in docker-compose.yml |
| "Module not found: axios" | Run `npm install` in `frontend/` |
| "ModuleNotFoundError: No module named 'fastapi'" | Activate venv, run `pip install -r requirements.txt` |
| Login fails | Check `.env`, ensure SECRET_KEY is set |
| QR not displaying | Ensure FRONTEND_URL in backend `.env` matches frontend domain |
| Database locked | Delete `honey.db`, restart backend |
| "CORS error" in browser | Check CORS_ORIGINS in backend `.env` includes frontend URL |

---

## 📝 Next Steps & Enhancements

- **Phase 2:** Real IoT sensor integration (ESP32 + MQTT)
- **Phase 3:** Mobile app (React Native) for beekeepers in field
- **Phase 4:** Lab integration API (HMF, pollen, c13/c12 ratio auto-sync)
- **Phase 5:** Multi-language UI (Hindi, Marathi, regional)
- **Phase 6:** Blockchain bridge (optional: export ledger to public chain for extreme transparency)

---

## 🙏 Credits

Built for KVIC's Honey Mission (SIH Problem Statement 26021). Designed with rural apiculture science and trust-building UX in mind.

---

## 📄 License

MIT License. See LICENSE file.

---

## 🌟 Demo Batch ID

For testing the verify page without creating a batch:
- Visit: http://localhost:3000/verify/demo-batch-001

---

**Happy tracing! 🍯**
