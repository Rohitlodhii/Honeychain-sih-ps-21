# HoneyChain Examples & Demo Scenarios

Complete, step-by-step walkthroughs for judges and testers.

---

## 📱 Demo 1: Full Consumer Verification Flow (3 min)

**Goal:** Show how a consumer verifies honey authenticity by scanning a QR code.

### Setup
1. Start the app: `docker-compose up`
2. Backend running at http://localhost:8000
3. Frontend running at http://localhost:3000

### Steps

**Step 1: Register & Create Hive (1 min)**
```
1. Go to http://localhost:3000/login?mode=register
2. Fill form:
   - Full Name: Ram Bhaiya
   - Phone: +91 9876543210
   - Password: test123
   - I am a: Beekeeper
   - Cluster: Vidarbha
3. Click "Create Account"
4. Auto-redirects to /dashboard
```

**Step 2: Add a Hive (30 sec)**
```
1. Left sidebar: "+ Add Hive"
2. Hive name: "Hive A"
3. Location: "Forest North"
4. Species: "Apis Mellifera"
5. Click "Create Hive"
```

**Step 3: Simulate Sensor Readings (30 sec)**
```
1. Main area shows "Hive Health" card
2. Click "Simulate Reading"
3. Wait for success message
4. Card updates with:
   - Status: HEALTHY ✓
   - Reasons explaining good temp, humidity, foraging
```

**Step 4: Create a Honey Batch (1 min)**
```
1. Click "+ New Batch" in Honey Batches section
2. Fill form:
   - Honey type: Wildflower
   - Quantity: 25 kg
   - Apiary location: Forest North
   - Moisture: 18.5%
3. Click "Create & Generate QR"
4. Success message with batch_id
5. QR code appears in batch list
```

**Step 5: Consumer Scans QR & Verifies (1 min)**
```
1. Download QR code from batch (or get the link)
2. QR links to: http://localhost:3000/verify/{batch_id}
3. Click the link or scan with phone
4. CONSUMER VERIFICATION PAGE APPEARS:
   - Top: "VERIFIED AUTHENTIC" badge (green)
   - Title: Wildflower
   - Beekeeper: Ram Bhaiya (Vidarbha)
   - Batch details: 25 kg, harvest date, purity score ~95/100
   - LEDGER TIMELINE (hero moment):
     * Block #0 (SYSTEM_INIT) - Genesis
     * Block #1 (HARVEST) - linked to Block #0 via prev_hash
       - Shows: quantity, honey_type, apiary_location, purity_score
       - Shows: truncated hash, proving proof-of-work
     * Each block shows icon, timestamp, actor, and linked chain
   - Chain Verification:
     * Status: Valid
     * Total blocks: 2
     * All hashes check out
5. Consumer can scroll through timeline, feel "unforgeable"
```

**🎯 Why this works:**
- Visual hash chain (linked blocks) = trust
- No login required = consumer-friendly
- Real data on screen = credible
- Purity score + beekeeper name = context

---

## 🔍 Demo 2: Anomaly Detection (2 min)

**Goal:** Show AI detecting disease/stress in a hive.

### Steps

**Step 1: From Dashboard, Same Hive**
```
1. Hive A still selected
2. In "Hive Health" card, click "Simulate Anomaly"
3. Wait for completion
```

**Step 2: Health Diagnosis Shows Anomaly**
```
System generates 5 readings:
- Reading 1–2: Normal (temp 34.5°C, humidity 58%, sound 220Hz)
- Reading 3: ANOMALY
  - Temp: 28.5°C (below optimal, bees struggling to maintain warmth)
  - Humidity: 72% (high, mold risk)
  - Sound: 150Hz (below healthy 180–260Hz range = disease/starvation indicator)
- Reading 4–5: Normal

Health card updates:
- Status: HIGH_RISK 🔴
- Confidence: 90%
- Reasons:
  ✓ Brood nest temp 28.5°C is below optimal. Bees may struggle...
  ⚠ Humidity 72% is high. Risk of mold...
  🔴 Acoustic anomaly: 150 Hz (normal 180–260 Hz). Possible disease...
  
  → Recommendation: "Investigate immediately."
```

**Step 3: Beekeeper Takes Action**
```
- In real world, Ram would check hive for signs of:
  * Varoa mites (distress calls drop frequency)
  * Starvation (bees don't have reserves)
  * Chalkbrood or other fungal diseases
- In demo, this is just to show the alert system works
```

**🎯 Why this works:**
- Real apiculture thresholds (not magic numbers)
- Actionable alerts (tells beekeeper what to investigate)
- Confidence score (not overconfident diagnosis)

---

## 🔐 Demo 3: Tamper Detection (Advanced, 3 min)

**Goal:** Show that ledger is unforgeable. Tamper with DB → badge flips to "TAMPERED".

### Prerequisites
- Batch already created from Demo 1
- Batch ID: e.g., `a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6`

### Steps

**Step 1: Note the Batch ID**
```
From /verify/{batch_id}, note the batch_id in the URL or page.
Batch ID example: a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6
```

**Step 2: Stop Backend & Access Database**
```bash
# Stop docker
docker-compose down

# Open SQLite
sqlite3 Honey/backend/honey.db

# List ledger blocks
sqlite> SELECT id, index, event_type, hash FROM ledger_blocks ORDER BY index;
# You'll see:
# | uuid1 | 0 | SYSTEM_INIT | abc123def456... |
# | uuid2 | 1 | HARVEST     | def456ghi789... |

# Copy the HARVEST block's hash (or any block's hash)
# Let's say it's: abc123def456xyz789
```

**Step 3: Tamper with the Hash**
```sql
-- Update the hash to a fake value
UPDATE ledger_blocks 
SET hash = 'fake000000000000' 
WHERE event_type = 'HARVEST';

-- Exit
.quit
```

**Step 4: Restart Backend**
```bash
docker-compose up
```

**Step 5: View Verify Page Again**
```
1. Go to http://localhost:3000/verify/{same_batch_id}
2. Look at top badge → NOW SHOWS: "⚠ TAMPERING DETECTED" (red)
3. Ledger Integrity section:
   - Status: TAMPERED
   - Error: "Block 1: hash mismatch. Expected abc123..., computed 789xyz..."
4. Authenticity badge is RED: ⚠ TAMPERED
```

**🎯 Why this works:**
- Shows the ledger is real (DB can be read)
- Shows verification actually works (re-computes hashes)
- Proves system detects tampering instantly

---

## 👨‍💼 Demo 4: KVIC Admin Dashboard (1 min)

**Goal:** Show cooperative-level insights.

### Steps

**Step 1: Register as Admin**
```
1. Go to /login?mode=register
2. Fill form:
   - Full Name: Priya Sharma (Cooperative Manager)
   - Phone: +91 9111111111
   - Password: admin123
   - I am a: Cooperative Admin (KVIC)
3. Click "Create Account"
4. Auto-login to /dashboard
5. Notice: "Cooperative Dashboard" button in top right
6. Click it
```

**Step 2: View Admin Dashboard**
```
1. URL: /admin
2. See key metrics:
   - Total Beekeepers: 1 (Ram Bhaiya)
   - Active Hives: 1 (Hive A)
   - Total Honey: 25 kg
   - Avg Purity: 95.0/100
3. See charts:
   - Batches by Status: HARVESTED (1)
   - Hive Health Distribution: HEALTHY (1), WATCH (0), HIGH_RISK (0)
4. See Ledger Integrity card (green):
   - Status: ALL BLOCKS VALID
   - Total Blocks: 2
   - No errors
```

**Step 3: Create More Beekeepers (Optional)**
```
- Register 2–3 more beekeepers from different clusters
- Create batches from each
- Refresh admin page → metrics aggregate
- Cluster breakdown shows supply by region
```

**🎯 Why this works:**
- KVIC has end-to-end visibility
- Can spot supply bottlenecks or quality issues
- Ledger integrity is machine-verified, not manual

---

## 💻 Demo 5: API Testing (Reference)

**Goal:** Show all endpoints work via curl/Postman.

### Register User
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Raj",
    "phone": "+91 9988776655",
    "password": "pass123",
    "role": "beekeeper",
    "cluster": "Maharashtra"
  }'

# Response:
# {"id": "uuid...", "name": "Raj", "phone": "+91 9988776655", ...}
```

### Login & Get Token
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+91 9988776655", "password": "pass123"}'

# Response:
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "token_type": "bearer",
#   "user": {...}
# }

# Save token:
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Create Hive
```bash
curl -X POST http://localhost:8000/api/hives \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hive B",
    "location": "Valley",
    "species": "apis_cerana",
    "latitude": 21.1458,
    "longitude": 79.0882
  }'

# Response: {"id": "hive-uuid...", "name": "Hive B", ...}
```

### Get Hives
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/hives

# Response: [{"id": "...", "name": "Hive B", ...}, ...]
```

### Simulate Readings
```bash
HIVE_ID="hive-uuid"

curl -X POST "http://localhost:8000/api/hives/$HIVE_ID/simulate?anomaly=false" \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "hive_id": "...",
#   "readings": [
#     {"id": "...", "temperature_c": 34.2, "humidity_pct": 58.1, "weight_kg": 25.3, "sound_hz": 218.0, ...},
#     ...
#   ],
#   "health_status": {
#     "status": "HEALTHY",
#     "confidence": 0.95,
#     "reasons": ["✓ Brood nest...", ...],
#     "metrics": {...}
#   },
#   "anomaly_detected": false,
#   "message": "Simulation complete."
# }
```

### Get Hive Health
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/hives/$HIVE_ID/health

# Response:
# {
#   "hive_id": "...",
#   "health": {
#     "status": "HEALTHY",
#     "confidence": 0.95,
#     "reasons": [...],
#     "metrics": {...}
#   },
#   "productivity": {
#     "yield_estimate_kg": 5.2,
#     "trend": "increasing",
#     "confidence": 0.7,
#     "next_harvest_days": 42,
#     "recommendation": "Hive is building honey reserves. Estimated harvest in 42 days."
#   },
#   "latest_reading": {...}
# }
```

### Create Batch
```bash
curl -X POST http://localhost:8000/api/batches \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hive_id": "'$HIVE_ID'",
    "honey_type": "Acacia",
    "quantity_kg": 30,
    "apiary_location": "Valley North",
    "moisture_pct": 17.5
  }'

# Response:
# {
#   "batch_id": "batch-uuid...",
#   "status": "HARVESTED",
#   "verify_url": "/verify/batch-uuid...",
#   "purity_score": 98.0,
#   "purity_status": "PASS"
# }
```

### Add Event to Batch
```bash
BATCH_ID="batch-uuid"

curl -X POST "http://localhost:8000/api/batches/$BATCH_ID/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "QUALITY_TEST",
    "payload": {
      "lab_name": "State Honey Testing Lab",
      "hmf_value": 15.5,
      "pollen_test": "PASS",
      "notes": "Premium quality confirmed."
    }
  }'

# Response: {"batch_id": "...", "status": "QUALITY_TEST", "event": "QUALITY_TEST"}
# Ledger now has 2 blocks: HARVEST + QUALITY_TEST
```

### Get QR Code
```bash
# Stream PNG
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/batches/$BATCH_ID/qr \
  > qr.png

# Or get via browser: http://localhost:8000/api/batches/{batch_id}/qr
```

### Verify Batch (Public, No Auth)
```bash
curl http://localhost:8000/api/verify/$BATCH_ID

# Response:
# {
#   "batch_id": "...",
#   "beekeeper_name": "Raj",
#   "beekeeper_cluster": "Maharashtra",
#   "honey_type": "Acacia",
#   "quantity_kg": 30,
#   "harvest_date": "2024-01-15T...",
#   "apiary_location": "Valley North",
#   "moisture_pct": 17.5,
#   "purity_score": 98.0,
#   "status": "QUALITY_TEST",
#   "ledger_timeline": [
#     {"index": 0, "batch_id": "...", "event_type": "HARVEST", ...},
#     {"index": 1, "batch_id": "...", "event_type": "QUALITY_TEST", ...}
#   ],
#   "chain_verification": {
#     "valid": true,
#     "errors": [],
#     "first_tampering_at_index": null,
#     "total_blocks": 3
#   },
#   "authenticity_badge": "VERIFIED"
# }
```

### Admin Overview
```bash
# Get or create an admin user first
ADMIN_TOKEN="admin-jwt-token"

curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8000/api/admin/overview

# Response:
# {
#   "total_beekeepers": 2,
#   "total_hives": 2,
#   "total_batches": 2,
#   "total_honey_kg": 55.0,
#   "batches_by_status": {"HARVESTED": 1, "QUALITY_TEST": 1},
#   "batches_by_cluster": {"Vidarbha": 1, "Maharashtra": 1},
#   "avg_purity_score": 96.5,
#   "avg_hive_health_status": {"HEALTHY": 2, "WATCH": 0, "HIGH_RISK": 0},
#   "ledger_integrity": {
#     "valid": true,
#     "errors": [],
#     "total_blocks": 4
#   }
# }
```

---

## 🎬 Demo 6: End-to-End Workflow (5 min)

**Complete scenario for judges.**

1. **Setup (30 sec):** `docker-compose up`
2. **Register beekeeper (1 min):** Create "Ram Bhaiya"
3. **Create hive (30 sec):** "Hive A", Forest North
4. **Simulate + verify health (1 min):** Normal reading, then anomaly, show alerts
5. **Create batch (1 min):** Wildflower, 25 kg, moisture 18.5%
6. **Consumer verify (30 sec):** Scan QR → see ledger timeline + "VERIFIED" badge
7. **Admin dashboard (1 min):** Register admin, show cluster stats + ledger integrity
8. **Tamper test (optional):** Edit DB, show "TAMPERING DETECTED"

**Total: ~5 minutes. Covers all key features.**

---

## 📋 Expected Outputs

### Hive Health Response (HEALTHY)
```json
{
  "status": "HEALTHY",
  "confidence": 0.95,
  "reasons": [
    "✓ Brood nest temperature 34.5°C is optimal (33–36°C range)",
    "✓ Humidity 58.0% is optimal (50–65% range)",
    "✓ Worker bee acoustic signature 220 Hz indicates normal activity"
  ],
  "metrics": {
    "temperature": 34.5,
    "humidity": 58.0,
    "sound": 220.0,
    "weight": 25.3
  }
}
```

### Hive Health Response (HIGH_RISK)
```json
{
  "status": "HIGH_RISK",
  "confidence": 0.9,
  "reasons": [
    "⚠ Brood temperature 28.5°C is below optimal. Bees may struggle to incubate...",
    "⚠ Humidity 72.0% is high. Risk of mold/fungus. Increase ventilation.",
    "🔴 Acoustic anomaly: 150.0 Hz (normal 180–260 Hz). Possible disease, starvation, or queen issue. Investigate immediately."
  ],
  "metrics": {
    "temperature": 28.5,
    "humidity": 72.0,
    "sound": 150.0,
    "weight": 24.8
  }
}
```

### Purity Scoring Response
```json
{
  "purity_score": 95.0,
  "status": "PASS",
  "moisture_compliant": true,
  "recommendation": "Honey meets initial purity screening. Ready for market (pending optional lab confirmation).",
  "requires_lab_confirmation": false,
  "details": "✓ Moisture 18.5% is excellent (≤18%)"
}
```

### Verify Response (VERIFIED)
```json
{
  "batch_id": "a1b2c3d4-...",
  "beekeeper_name": "Ram Bhaiya",
  "beekeeper_cluster": "Vidarbha",
  "honey_type": "Wildflower",
  "quantity_kg": 25.0,
  "harvest_date": "2024-01-15T10:30:00",
  "apiary_location": "Forest North",
  "moisture_pct": 18.5,
  "purity_score": 95.0,
  "status": "HARVESTED",
  "ledger_timeline": [
    {
      "index": 0,
      "batch_id": "a1b2c3d4-...",
      "event_type": "SYSTEM_INIT",
      "payload": {"description": "HoneyChain Ledger Genesis"},
      "actor": "system",
      "timestamp_str": "2024-01-15T09:00:00Z",
      "hash": "00abc123def456..."
    },
    {
      "index": 1,
      "batch_id": "a1b2c3d4-...",
      "event_type": "HARVEST",
      "payload": {
        "quantity_kg": 25.0,
        "honey_type": "Wildflower",
        "apiary_location": "Forest North",
        "moisture_pct": 18.5,
        "purity_score": 95.0
      },
      "actor": "beekeeper-uuid",
      "timestamp_str": "2024-01-15T10:30:00Z",
      "hash": "00def456ghi789..."
    }
  ],
  "chain_verification": {
    "valid": true,
    "errors": [],
    "first_tampering_at_index": null,
    "total_blocks": 2
  },
  "authenticity_badge": "VERIFIED"
}
```

---

## 🎓 Judge Talking Points

- **"Why hash-chaining vs. public blockchain?"** Permissioned design = fast, offline-capable, zero gas fees. KVIC knows all participants.
- **"How do you ensure hive data is real?"** Simulation endpoints for demo; real systems integrate IoT sensors or manual entry by trusted beekeepers.
- **"Is purity scoring lab-certified?"** No—it's a field screening (moisture-based). Borderline results flagged for lab HMF/pollen/c13c12 testing.
- **"Can beekeepers cheat?"** Not without breaking the hash chain. Tampering is instantly detected (and visible on consumer page).
- **"How does KVIC scale this?"** Each region/cluster can run its own ledger node; can federate ledgers across regions.

---

**End of Examples. Happy demoing! 🍯**
