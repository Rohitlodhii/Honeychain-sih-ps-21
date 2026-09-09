# HoneyChain: Complete Setup & Quick Start Guide

**For SIH Problem Statement 26021 (KVIC Honey Mission)**

---

## 🎯 What You Have

A **complete, production-ready** full-stack honey traceability system:

✅ **Backend**: FastAPI + SQLAlchemy + Hash-chained Ledger + AI Analytics  
✅ **Frontend**: Next.js 14 + Tailwind CSS (beautiful, rural-first UI)  
✅ **Database**: SQLite (dev) / PostgreSQL (prod)  
✅ **Docker**: One-command deployment  
✅ **Docs**: README.md, EXAMPLES.md, DEPLOYMENT.md, this file  

---

## 🚀 Quick Start (5 minutes)

### Option A: Docker (Recommended)

```bash
cd Honey
docker-compose up
```

Then visit:
- **Frontend:** http://localhost:3000
- **Backend API Docs:** http://localhost:8000/docs

### Option B: Manual Setup

**Backend:**
```bash
cd Honey/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend** (new terminal):
```bash
cd Honey/frontend
npm install
npm run dev
```

---

## 🎬 First Demo (3 minutes)

### 1. Register Beekeeper
- Go to http://localhost:3000/login?mode=register
- Fill in:
  - Name: "Ram Bhaiya"
  - Phone: +91 9876543210
  - Password: test123
  - Role: Beekeeper
  - Cluster: Vidarbha
- Click "Create Account"

### 2. Create Hive
- Dashboard loads
- Click "+ Add Hive"
- Name: "Hive A", Location: "Forest North", Species: "Apis Mellifera"
- Create

### 3. Simulate Readings
- Click "Simulate Reading" → Health diagnosis appears (HEALTHY)
- Click "Simulate Anomaly" → Detects disease (HIGH_RISK)

### 4. Create Batch & Verify
- Click "+ New Batch"
- Type: "Wildflower", Qty: 25kg, Moisture: 18.5%
- Create → Get QR code
- Copy batch ID from success message
- Go to http://localhost:3000/verify/{batch_id}
- See full ledger timeline + authenticity badge

**That's it! You've traced honey from hive to consumer. ✨**

---

## 📁 Project Structure

```
Honey/
├── backend/                   # FastAPI server
│   ├── main.py               # All routes (auth, hives, batches, verify, admin)
│   ├── ledger.py             # Hash-chained ledger (SHA-256, PoW)
│   ├── analytics.py          # Hive health + purity scoring
│   ├── models.py             # SQLAlchemy ORM
│   ├── schemas.py            # Pydantic request/response models
│   ├── auth.py               # JWT + password hashing
│   ├── database.py           # Session management
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile            # Container
│   └── .env.example          # Environment template
│
├── frontend/                  # Next.js app
│   ├── app/
│   │   ├── page.tsx          # Landing page (hero + QR demo)
│   │   ├── login/            # Auth pages
│   │   ├── dashboard/        # Beekeeper dashboard (hives + batches)
│   │   ├── verify/[id]/      # Consumer verification (hero page)
│   │   ├── admin/            # Cooperative dashboard
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Design system
│   ├── lib/
│   │   └── api.ts            # Axios client + API wrappers
│   ├── package.json          # Node dependencies
│   ├── tailwind.config.js    # Design tokens
│   ├── Dockerfile            # Container
│   └── .env.example          # Environment template
│
├── docker-compose.yml        # Multi-container orchestration
├── README.md                 # Full documentation
├── EXAMPLES.md               # Demo scenarios & test cases
├── DEPLOYMENT.md             # Production deployment guide
├── START.sh / START.bat      # Quick start scripts
└── .gitignore
```

---

## 🔐 Key Features

### 1. **Tamper-Proof Ledger**
- Hash-chained blocks (SHA-256)
- Proof-of-work (2 leading zero hex chars)
- Verification on every batch view
- Consumer instantly sees if honey is "VERIFIED" or "TAMPERED"

### 2. **AI Hive Health**
- Real apiculture thresholds:
  - Temp: 33–36°C optimal (brood development)
  - Humidity: 50–65% optimal (prevents mold)
  - Sound: 180–260 Hz (worker bee acoustics)
- Three-level diagnosis: HEALTHY, WATCH, HIGH_RISK
- Actionable alerts for beekeepers

### 3. **Rural-First UI**
- Large touch targets
- Minimal text (emoji icons)
- Hindi-ready labels
- Accessible to non-technical users

### 4. **Offline Capable**
- SQLite stores all data locally
- Sync when connected
- No internet dependency for core operations

### 5. **KVIC Cooperative Dashboard**
- Cluster-level aggregates
- Supply tracking by region
- Hive health distribution
- Ledger integrity monitoring

---

## 🧪 Testing

### Unit Test the API

```bash
# In backend directory
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Raj",
    "phone": "+91 9999999999",
    "password": "test123",
    "role": "beekeeper",
    "cluster": "Maharashtra"
  }'

# Get token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+91 9999999999", "password": "test123"}'
```

### Full Workflow Test

See **EXAMPLES.md** for 6 complete demo scenarios with expected outputs.

---

## 🔌 Environment Variables

### Backend (.env)
```
DATABASE_URL=sqlite:///./honey.db
SECRET_KEY=dev-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
FRONTEND_URL=http://localhost:3000
API_PORT=8000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📊 Database Schema

### Core Tables
- **User**: id, name, phone, email, role, cluster, hashed_password
- **Hive**: id, beekeeper_id, name, location, species, latitude, longitude
- **SensorReading**: id, hive_id, temperature_c, humidity_pct, weight_kg, sound_hz, recorded_at
- **Batch**: id, beekeeper_id, hive_id, honey_type, quantity_kg, harvest_date, apiary_location, moisture_pct, purity_score, status, current_owner
- **LedgerBlock**: id, index, batch_id, event_type, payload (JSON), actor, timestamp_str, prev_hash, hash, nonce

---

## 🎨 Design System

| Token | Color | Use |
|-------|-------|-----|
| espresso | #171210 | Base background |
| surface | #241B14 | Cards, elevated areas |
| honey | #E3A530 | Primary accent, CTAs |
| amber | #B6651D | Secondary, borders |
| cream | #F3E9D2 | Text (light) |
| sage | #7C9473 | Healthy states |
| brick | #B4523A | Alerts/errors |

---

## 🚀 Deployment

### Quick Cloud Deploy

**Backend (Render):**
1. Push to GitHub
2. Create Render Web Service, connect repo
3. Set env vars (see DEPLOYMENT.md)
4. Deploy

**Frontend (Vercel):**
1. Import GitHub repo
2. Root directory: `Honey/frontend`
3. Set `NEXT_PUBLIC_API_URL` to backend URL
4. Deploy

See **DEPLOYMENT.md** for detailed Render + Vercel setup.

**Cost:** ~$42/month (Render Starter $7 + Postgres $15 + Vercel Pro $20)

---

## 📞 Troubleshooting

| Issue | Fix |
|-------|-----|
| Port already in use | `lsof -i :3000`, kill process, or change in docker-compose.yml |
| "Module not found" in backend | `pip install -r requirements.txt` in venv |
| Frontend build fails | `npm ci` to clean install, check Node version (18+) |
| CORS error | Check CORS_ORIGINS in backend .env matches frontend URL |
| Database locked (SQLite) | Delete `honey.db`, restart backend |
| Vercel QR links broken | Update FRONTEND_URL in backend env vars |

---

## 📚 Files Reference

| File | Purpose |
|------|---------|
| README.md | Full technical documentation |
| EXAMPLES.md | 6 complete demo scenarios with curl examples |
| DEPLOYMENT.md | Production cloud deployment guide |
| docker-compose.yml | Local dev orchestration |
| backend/main.py | All API endpoints (400+ lines) |
| backend/ledger.py | Blockchain ledger implementation |
| backend/analytics.py | Hive health & purity scoring |
| frontend/app/page.tsx | Landing page with live QR demo |
| frontend/app/verify/[id]/page.tsx | Consumer verification (trust page) |

---

## 🎯 Key API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/register` | POST | ❌ | Register user |
| `/api/auth/login` | POST | ❌ | Get JWT token |
| `/api/hives` | GET/POST | ✅ | List/create hives |
| `/api/hives/{id}/health` | GET | ✅ | Get hive health diagnosis |
| `/api/hives/{id}/simulate` | POST | ✅ | Generate test readings |
| `/api/batches` | GET/POST | ✅ | List/create honey batches |
| `/api/batches/{id}/events` | POST | ✅ | Add batch event (QA, transfer, sale) |
| `/api/batches/{id}/qr` | GET | ✅ | Stream QR code PNG |
| `/api/verify/{id}` | GET | ❌ | **Consumer verification page** |
| `/api/admin/overview` | GET | ✅ | Cooperative dashboard stats |

---

## 💡 Next Steps

1. **Demo:** Follow "First Demo (3 minutes)" above
2. **Explore:** Check out EXAMPLES.md for advanced scenarios
3. **Customize:** Update design tokens in frontend/tailwind.config.js
4. **Deploy:** Follow DEPLOYMENT.md to go live on Render + Vercel
5. **Scale:** Add real IoT sensor integration, multi-region ledgers, etc.

---

## 🙏 Built For

KVIC (Khadi and Village Industries Commission) Honey Mission  
Problem Statement 26021  
September 2024

---

## 📄 License

MIT

---

**Ready to trace honey from hive to cup? Let's go! 🍯**

```bash
cd Honey
docker-compose up
```

Then visit http://localhost:3000

Questions? Check README.md, EXAMPLES.md, or DEPLOYMENT.md.
