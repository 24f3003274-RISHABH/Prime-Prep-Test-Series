# PrimePrep: Project Master Plan

**Project Type:** CUET PG Test Preparation Platform  
**Target Audience:** Students preparing for CUET PG across 7 initial subjects  
**Stack:** PERN (PostgreSQL via `pg`, Express.js, React.js, Node.js)  
**Deployment:** Vercel (Frontend), Render (Backend), Supabase (PostgreSQL)  
**Development Methodology:** Database-first, backend-first, incremental 8-phase execution

---

## 1. Domain & Content Hierarchy

```
Subject (e.g., Political Science)
  └── Chapters (e.g., Western Political Thought)
       └── Tests (Configurable: Sectional 30m, Full-Length 90m, PYQ)
            └── Test Questions (Deterministic sequence & mark overrides)
                 └── Questions (Reusable question bank)
```

### Initial 7 CUET PG Subjects
1. Political Science
2. Philosophy
3. Psychology
4. History
5. Economics
6. Geography
7. Disaster Management

---

## 2. Eight-Phase Execution Roadmap

### Phase 1: Project Initialization & Decoupled Architecture (COMPLETED)
- [x] Workspace inspection and structure design (`frontend/`, `backend/`, `docs/`).
- [x] Frontend initialized (React, Vite, Native Fetch client, Plain CSS).
- [x] Backend initialized (Node.js, Express, ES modules, `pg` connection pool).
- [x] Working `GET /api/health` with process uptime and live DB connectivity.
- [x] Documented environment templates and gitignore security.

### Phase 2: Database Architecture & PostgreSQL Migrations (COMPLETED)
- [x] Direct Supabase PostgreSQL connection using `pg` connection pool with SSL.
- [x] Transactional migration runner (`backend/scripts/migrate.js`).
- [x] 10 modular migrations executed and tracked in `schema_migrations`.
- [x] Verified 6/6 architecture checks via `backend/scripts/verify-schema.js`.
- [x] Preserved existing user records and pre-seeded 7 CUET PG subjects.

### Phase 3: Administrator Bootstrap & Authentication System (COMPLETED & VERIFIED)
- [x] Password hashing using `bcrypt` (10 rounds).
- [x] JWT token signing and verification with `JWT_SECRET`.
- [x] Student registration endpoint (`POST /api/auth/register`) with input sanitization and email normalization.
- [x] Student and administrator login endpoint (`POST /api/auth/login`) with active status verification.
- [x] One-time administrator setup mechanism (`POST /api/auth/setup-admin` & `backend/scripts/bootstrap-admin.js`) protected by `ADMIN_SETUP_SECRET`.
- [x] Reusable Express middleware: `requireAuth` and `requireAdmin`.
- [x] Current user session endpoint (`GET /api/auth/me`).
- [x] Client session management and logout (`POST /api/auth/logout`).
- [x] React frontend authentication views (`LoginForm`, `RegisterForm`, `AdminSetupForm`, `StudentDashboard`, `AdminDashboard`).
- [x] Automated test suite in `backend/tests/auth.test.js` passing 14/14 test requirements.

### Phase 4: Subject, Chapter & Test Management APIs (NEXT)
- [ ] Subject CRUD (`GET /api/subjects`, `POST /api/admin/subjects`, `PATCH /api/admin/subjects/:id`).
- [ ] Chapter CRUD (`GET /api/subjects/:id/chapters`, `POST /api/admin/chapters`, `PATCH /api/admin/chapters/:id`).
- [ ] Test series & mock test CRUD (`GET /api/chapters/:id/tests`, `POST /api/admin/tests`).
- [ ] All operations protected by `requireAuth` and `requireAdmin`.

### Phase 5: Excel Bulk Question Import Engine
- [ ] Standard `.xlsx` question template generator.
- [ ] Upload & preview validation endpoint (`POST /api/admin/imports/preview`).
- [ ] Transactional bulk insertion (`POST /api/admin/imports/confirm`).

### Phase 6: Student Test Engine & Authoritative Evaluation
- [ ] Test session initialization & server-authoritative timer.
- [ ] Question navigation & answer save endpoint.
- [ ] Test submission, score calculation, and review solutions.

### Phase 7: React Frontend Integration
- [ ] Student subject & chapter explorer, test runner palette, countdown timer.
- [ ] Admin subject, test series, and question bank management interface.

### Phase 8: Production Deployment & Verification
- [ ] Render configuration for Express backend.
- [ ] Vercel configuration for React frontend.
