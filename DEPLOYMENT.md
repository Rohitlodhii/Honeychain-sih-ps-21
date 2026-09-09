# HoneyChain Deployment Guide

Complete instructions for deploying HoneyChain to production across cloud platforms.

---

## 📋 Prerequisites

- GitHub account (for version control & CI/CD)
- Vercel account (for frontend, free tier available)
- Render or Railway account (for backend)
- PostgreSQL database (managed service, e.g., Heroku Postgres, AWS RDS, or managed on Render/Railway)

---

## 🚀 Deployment Architecture

```
Internet
    ↓
Vercel (Frontend: Next.js)
    ↓ (API calls)
Render/Railway (Backend: FastAPI)
    ↓ (queries)
PostgreSQL (Managed Database)
```

---

## 1️⃣ Backend Deployment (Render)

Render is ideal for FastAPI: free tier available, easy Dockerfile deployment.

### Step 1: Push to GitHub

```bash
cd Honey
git init
git add .
git commit -m "Initial HoneyChain deployment"
git remote add origin https://github.com/YOUR_USERNAME/honeychain.git
git push -u origin main
```

### Step 2: Create PostgreSQL Database on Render

1. Go to https://render.com
2. Sign in / create account
3. Click "New" → "PostgreSQL"
4. Name: `honeychain-db`
5. Region: Choose closest to your users (e.g., Singapore, Ireland)
6. Database name: `honeychain`
7. Click "Create Database"
8. Note the connection string (e.g., `postgresql://user:pass@dpg-xxx.render.com:5432/honeychain`)

### Step 3: Create Web Service (Backend)

1. Go to Render Dashboard
2. Click "New" → "Web Service"
3. Connect GitHub: Select `honeychain` repo
4. Settings:
   - **Name:** `honeychain-backend`
   - **Root Directory:** `Honey/backend`
   - **Runtime:** Python 3.11
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Environment Variables:**
   ```
   DATABASE_URL=postgresql://user:pass@host/honeychain
   SECRET_KEY=<generate-random-32-char-string>
   CORS_ORIGINS=https://your-frontend-domain.vercel.app
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   ```
6. **Plan:** Free (for dev/testing) or Starter ($7/month for production)
7. Click "Create Web Service"
8. Render builds & deploys automatically
9. Get your backend URL: `https://honeychain-backend-xxxxx.onrender.com`

**Note:** Free tier spins down after 15 min inactivity. For production, upgrade to Starter.

### Step 4: Test Backend

```bash
curl https://honeychain-backend-xxxxx.onrender.com/docs
# Should return Swagger UI HTML
```

---

## 2️⃣ Frontend Deployment (Vercel)

Vercel is the easiest for Next.js.

### Step 1: Create Vercel Project

1. Go to https://vercel.com
2. Sign in with GitHub (recommended)
3. Click "Import Project"
4. Select your GitHub `honeychain` repo
5. Settings:
   - **Framework:** Next.js
   - **Root Directory:** `Honey/frontend`
   - **Environment Variables:**
     ```
     NEXT_PUBLIC_API_URL=https://honeychain-backend-xxxxx.onrender.com
     ```
6. Click "Deploy"
7. Vercel builds & deploys
8. Get your frontend URL: `https://honeychain-xxxxx.vercel.app`

### Step 2: Update Backend Environment

Go back to Render and update:
```
CORS_ORIGINS=https://honeychain-xxxxx.vercel.app
FRONTEND_URL=https://honeychain-xxxxx.vercel.app
```

Render auto-restarts the service with new env vars.

### Step 3: Test Frontend

Visit `https://honeychain-xxxxx.vercel.app` in your browser. Should load without CORS errors.

---

## 3️⃣ Custom Domain (Optional)

### Add Domain to Vercel

1. Vercel Dashboard → Project Settings → Domains
2. Enter your domain (e.g., `honeychain.example.com`)
3. Add DNS records as Vercel instructs
4. Propagates in 24–48 hours

### Update Backend CORS

Once domain is live, update Render env var:
```
CORS_ORIGINS=https://honeychain.example.com
```

---

## 4️⃣ Environment Variables Checklist

### Backend (Render)

| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://user:pass@dpg-xxx.render.com:5432/honeychain` | From Render PostgreSQL |
| `SECRET_KEY` | `abcd1234efgh5678ijkl9012mnopqrst` | Generate: `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `CORS_ORIGINS` | `https://honeychain-xxxxx.vercel.app` | Frontend URL |
| `FRONTEND_URL` | `https://honeychain-xxxxx.vercel.app` | For QR links |
| `API_PORT` | `$PORT` | Render sets this automatically |

### Frontend (Vercel)

| Variable | Example | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_API_URL` | `https://honeychain-backend-xxxxx.onrender.com` | Backend URL |

---

## 5️⃣ Database Migrations

First deployment only: Create tables.

### Option A: Automatic (Recommended)

SQLAlchemy in `main.py` auto-creates tables at startup:
```python
@app.on_event("startup")
async def startup():
    db_config = get_db_config()
    db_config.init_db()  # Creates all tables
```

Just deploy—tables are created on first run.

### Option B: Manual (Advanced)

SSH into backend & run:
```bash
python -c "from database import get_db_config; get_db_config().init_db()"
```

---

## 6️⃣ Monitoring & Logs

### Render Logs

1. Render Dashboard → Web Service → Logs
2. Real-time output from `uvicorn`
3. Errors appear instantly

### Vercel Logs

1. Vercel Dashboard → Project → Deployments
2. Click a deployment → Logs
3. Build and runtime logs

### Database Monitoring

Render PostgreSQL dashboard shows:
- CPU, memory, connections
- Query stats (if enabled)
- Backups (daily free, hourly paid)

---

## 7️⃣ Scaling & Optimizations

### Backend (Render)

For production traffic (>100 concurrent users):
- Upgrade to **Starter** plan ($7/month): 0.5 CPU, 512 MB RAM
- Add **Manual Scaling**: 2–3 instances for redundancy
- Enable **Auto Scaling** (paid feature)

### Database (Render PostgreSQL)

For production data:
- Upgrade to **Standard** plan ($15/month): 1 CPU, 1 GB RAM
- Enable automated backups (7-day retention)
- Monitor slow queries via Render dashboard

### Frontend (Vercel)

Vercel scales automatically (no config needed). For enterprise:
- Upgrade to **Pro** ($20/month): analytics, edge functions, priority support

---

## 8️⃣ Security Checklist

- [ ] Change `SECRET_KEY` in production (generate random)
- [ ] Use HTTPS (automatic on Render & Vercel)
- [ ] Set `CORS_ORIGINS` to exact frontend domain (not `*`)
- [ ] Enable database backups (Render: automatic daily)
- [ ] Rotate `SECRET_KEY` every 6 months
- [ ] Monitor logs for suspicious activity
- [ ] Use strong, unique passwords for all accounts
- [ ] Enable GitHub branch protection (require PR reviews)
- [ ] Set up rate limiting on API (optional, add to FastAPI)

---

## 9️⃣ Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection refused" on frontend | Check `NEXT_PUBLIC_API_URL` in Vercel env vars |
| CORS error | Ensure Render `CORS_ORIGINS` includes frontend URL exactly (with https://) |
| Database won't connect | Check `DATABASE_URL` format and test with `psql` CLI |
| "Module not found" on Render | Ensure `requirements.txt` in `backend/` root |
| Vercel build fails | Check `frontend/` Next.js config and `package.json` |
| Render free tier sleeping | Upgrade to Starter, or ping `/docs` endpoint every 14 min (cheap uptime monitoring) |
| QR codes link to localhost | Update `FRONTEND_URL` in backend env vars |

---

## 🔟 CI/CD Pipeline (GitHub Actions)

Automate tests on every push (optional).

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy HoneyChain

on:
  push:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: cd backend && pip install -r requirements.txt
      - run: cd backend && python -m pytest  # If tests exist

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
      - run: cd frontend && npm run lint

  deploy:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render Deploy
        run: |
          curl -X POST https://api.render.com/deploy/srv-xxx?key=YOUR_API_KEY
      - name: Trigger Vercel Deploy
        run: |
          curl -X POST https://api.vercel.com/v12/deployments?teamId=TEAM_ID \
            -H "Authorization: Bearer ${{ secrets.VERCEL_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"gitSource":{"ref":"main","repoId":"xxx"}}'
```

---

## 1️⃣1️⃣ Cost Breakdown (Monthly, Production)

| Service | Tier | Cost | Notes |
|---------|------|------|-------|
| Render (Backend) | Starter | $7 | 0.5 CPU, 512 MB RAM |
| Render (PostgreSQL) | Standard | $15 | 1 CPU, 1 GB RAM, daily backups |
| Vercel (Frontend) | Pro | $20 | Priority support, advanced analytics |
| **Total** | | **$42** | Scales to ~100–1000 concurrent users |

**Cheaper Option:** Stick with free tiers for MVP (Render free + Vercel free). Render free tier sleeps after 15 min, but fine for demo.

---

## 1️⃣2️⃣ Post-Deployment Checklist

- [ ] Backend `/docs` endpoint loads
- [ ] Frontend homepage displays
- [ ] Login page works
- [ ] Can register user
- [ ] Can create hive
- [ ] Can create batch
- [ ] QR links to public verify page
- [ ] Verify page shows ledger timeline
- [ ] Admin dashboard loads (if admin user exists)
- [ ] Logs show no errors
- [ ] Response times < 500ms (check in Vercel Analytics)
- [ ] Database connections stable (check Render dashboard)

---

## 1️⃣3️⃣ Scaling to Multi-Region (Advanced)

For KVIC's honey supply spanning multiple Indian states:

1. **Backend:** Deploy separate Render instances for each region:
   - `honeychain-backend-north.onrender.com` (Delhi/Uttarakhand)
   - `honeychain-backend-south.onrender.com` (Karnataka/Tamil Nadu)
   - Each with regional PostgreSQL (Render India region if available)

2. **Frontend:** Single global Vercel deployment

3. **API Routing:** Frontend detects region, routes to regional backend (or use API gateway)

4. **Ledger Federation:** Each regional ledger syncs with central ledger (advanced architecture)

---

## Resources

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- FastAPI Deployment: https://fastapi.tiangolo.com/deployment/
- Next.js Deployment: https://nextjs.org/docs/deployment

---

**Deployment Complete! 🎉**

Visit your production site: `https://your-domain.com`

