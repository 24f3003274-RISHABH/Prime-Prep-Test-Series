# PrimePrep: CUET PG Test Preparation Platform

PrimePrep is a professional, database-driven test preparation platform tailored for CUET PG entrance examination aspirants.

Built using the **PERN stack** (PostgreSQL, Express.js, React.js, Node.js) with independent frontend and backend packages ready for deployment to **Vercel** (frontend) and **Render** (backend) with **Supabase** (PostgreSQL).

---

## 1. Project Structure

```
PrimePrep/
├── frontend/                   # Standalone React + Vite application (Vercel target)
│   ├── src/
│   │   ├── api/client.js       # Native Fetch API client
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Route pages
│   │   ├── layouts/            # Page layouts
│   │   ├── App.jsx             # Root React view
│   │   ├── main.jsx            # DOM mounting
│   │   └── index.css           # Plain CSS stylesheet
│   ├── .env.example            # VITE_API_BASE_URL template
│   ├── package.json            # Frontend dependencies (React, React Router)
│   └── vite.config.js          # Vite config
│
├── backend/                    # Standalone Node.js Express application (Render target)
│   ├── src/
│   │   ├── config/             # DB connection pool (pg) & environment
│   │   ├── controllers/        # Request handlers (health, auth, subjects, etc.)
│   │   ├── middleware/         # CORS, error handling, auth guards
│   │   ├── routes/             # REST API routes
│   │   ├── services/           # Business logic & Excel parser
│   │   ├── repositories/       # Parameterized SQL query layers
│   │   ├── app.js              # Express app definition
│   │   └── server.js           # Express server entrypoint
│   ├── migrations/             # SQL migrations for Supabase
│   ├── scripts/                # Admin bootstrap & utility scripts
│   ├── tests/                  # Automated test suite (node:test)
│   ├── .env.example            # Backend environment variables
│   └── package.json            # Backend dependencies (express, pg, bcrypt, xlsx)
│
├── docs/                       # Project documentation
│   ├── PROJECT_PLAN.md         # 8-Phase master roadmap
│   ├── DATABASE_SCHEMA.md      # PostgreSQL entity relationship & constraints
│   ├── API_DOCUMENTATION.md    # REST API specification
│   ├── PROGRESS.md             # Living phase tracker & verification log
│   └── ADMIN_SETUP.md          # One-time administrator bootstrap guide
│
├── server.ts                   # Unified dev server (Express API + Vite middleware)
├── package.json                # Root orchestration & scripts
├── .gitignore                  # Git exclusion rules
└── README.md                   # Project overview & running instructions
```

---

## 2. Quickstart & Local Development

### Option A: Run Full-Stack Simultaneously (Recommended for Development)
Runs the unified Express backend with Vite frontend on port 3000:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.  
Health check endpoint: [http://localhost:3000/api/health](http://localhost:3000/api/health).

### Option B: Run Frontend and Backend Independently

#### Run Backend Standalone (Port 5000)
```bash
npm run dev:backend
# Or:
cd backend && npm run dev
```
Accessible at: [http://localhost:5000/api/health](http://localhost:5000/api/health)

#### Run Frontend Standalone (Port 5173)
```bash
cd frontend && npm run dev
```
Accessible at: [http://localhost:5173](http://localhost:5173)

---

## 3. Running Automated Tests & Verification

### Run Backend Automated Tests
```bash
npm run test:backend
```
Executes Node.js native test suite against `backend/tests/health.test.js`.

### Run Production Build
```bash
npm run build
```

---

## 4. Phase Verification Checklist Before Phase 2

Before beginning **Phase 2 (PostgreSQL Schema & Supabase Setup)**, verify the following:

- [x] Workspace structure contains `frontend/`, `backend/`, and `docs/`.
- [x] `backend/src/app.js` and `backend/src/server.js` start without syntax errors.
- [x] `GET /api/health` returns `200 OK` with JSON `{ "status": "ok", "service": "PrimePrep API", ... }`.
- [x] Frontend displays the system health card and can ping the API in real time.
- [x] Automated backend test passes (`npm run test:backend`).
- [x] `docs/PROJECT_PLAN.md` and `docs/PROGRESS.md` are up to date.
- [ ] You have access to your Supabase project dashboard to receive the PostgreSQL connection string.
