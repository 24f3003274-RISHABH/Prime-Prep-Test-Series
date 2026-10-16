# PrimePrep: Project Master Plan

**Project Type:** CUET PG Test Preparation Platform  
**Target Audience:** Students preparing for CUET PG across 7 initial subjects  
**Stack:** PERN (PostgreSQL, Express.js, React.js, Node.js)  
**Deployment:** Vercel (Frontend), Render (Backend), Supabase (PostgreSQL)  
**Development Methodology:** Database-first, backend-first, incremental 8-phase execution

---

## 1. Domain & Subject Hierarchy

### 1.1 Initial Subjects (Stored in Supabase PostgreSQL)
1. Political Science
2. Philosophy
3. Psychology
4. History
5. Economics
6. Geography
7. Disaster Management

### 1.2 Hierarchy Structure
```
Subject (e.g., Political Science)
  │
  ├── Sectional Test Series (Configurable default: 15 tests)
  │     ├── Test 1
  │     ├── Test 2
  │     └── ...
  │
  ├── Full-Length Test Series (Configurable default: 10 tests)
  │     ├── Test 1
  │     ├── Test 2
  │     └── ...
  │
  └── Previous Year Question (PYQ) Test Series (Configurable default: 5 tests)
        ├── 2024 PYQ
        ├── 2023 PYQ
        └── ...
```

---

## 2. Eight-Phase Execution Roadmap

### Phase 1: Project Initialization & Decoupled Architecture (CURRENT)
- [x] Inspect workspace and initialize clean directory structure (`frontend/`, `backend/`, `docs/`).
- [x] Initialize frontend (React 19, Vite, React Router, Plain CSS, Native Fetch client).
- [x] Initialize backend (Node.js, Express, ES modules, pg connection pool configuration).
- [x] Implement and verify `GET /api/health` with process uptime and DB reachability detection.
- [x] Create `.env.example` templates and update `.gitignore`.
- [x] Set up root documentation: `PROJECT_PLAN.md`, `PROGRESS.md`, `README.md`.
- [x] Verify builds and automated unit tests.

### Phase 2: PostgreSQL Database Schema & Supabase Setup
- [ ] Draft migration `001_initial_schema.sql` covering 12 core tables:
  1. `subjects`
  2. `profiles`
  3. `admin_users`
  4. `test_categories`
  5. `test_series`
  6. `tests`
  7. `questions`
  8. `test_questions`
  9. `test_attempts`
  10. `attempt_responses`
  11. `import_history`
  12. `audit_logs`
- [ ] Implement explicit question & test ordering, marks decimal precision, duration constraints.
- [ ] Create foreign key cascades and unique constraints (e.g. single student active attempt per test).
- [ ] Document migration execution instructions for Supabase SQL Editor.
- [ ] Verify schema integrity via SQL inspection script.

### Phase 3: Administrator Bootstrap & Authentication System
- [ ] Implement secure CLI bootstrap script `backend/scripts/bootstrap-admin.js`.
- [ ] Enforce `ADMIN_SETUP_SECRET` validation, single-admin initialization check, and bcrypt hashing.
- [ ] Audit log admin creation in `audit_logs`.
- [ ] Implement student registration (`POST /api/auth/register`) with password hashing.
- [ ] Implement student & admin login (`POST /api/auth/login`) with signed JWT tokens.
- [ ] Implement authenticated user profile (`GET /api/auth/me`) and logout (`POST /api/auth/logout`).
- [ ] Build Express authentication and role-authorization middleware (`requireAuth`, `requireAdmin`).

### Phase 4: Subject and Test Management APIs
- [ ] Subject CRUD (`GET /api/subjects`, `POST /api/admin/subjects`, `PATCH /api/admin/subjects/:id`).
- [ ] Test Categories endpoints (`GET /api/test-categories`).
- [ ] Test Series CRUD with configurable default test quotas per subject.
- [ ] Test CRUD (`POST /api/admin/tests`, `PATCH /api/admin/tests/:id`).
- [ ] Ensure all operations are strictly parameterized SQL queries.

### Phase 5: Excel Bulk Question Import Engine
- [ ] Design standard Excel question template (`.xlsx`) with required columns:
  - `question_number`, `question`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_option`, `explanation`, `positive_marks`, `negative_marks`, `time_limit_seconds`.
- [ ] Implement template download endpoint (`GET /api/admin/imports/template`).
- [ ] Build Excel parser service using `xlsx` with strict row-by-row validation.
- [ ] Implement preview validation endpoint (`POST /api/admin/imports/preview`).
- [ ] Implement transactional batch import endpoint (`POST /api/admin/imports/confirm`) ensuring all-or-nothing atomicity.
- [ ] Record import metadata and outcome in `import_history`.

### Phase 6: Student Test Engine & Authoritative Evaluation
- [ ] Implement test attempt initialization (`POST /api/tests/:testId/attempts`).
- [ ] Server-authoritative timer generation preventing client clock manipulation.
- [ ] Real-time response save endpoint (`PUT /api/attempts/:attemptId/responses`).
- [ ] Mark-for-review toggle and answered counter tracking.
- [ ] Enforce single-attempt restriction via database constraint and transactional lock.
- [ ] Test submission and backend grading (`POST /api/attempts/:attemptId/submit`).
- [ ] Test results summary and post-submission explanation viewing (questions stripped of answers prior to submission).

### Phase 7: React Frontend Integration
- [ ] Authentication views: Student Login, Student Registration, Admin Login.
- [ ] Student views: Dashboard, Subject List, Series Explorer, Test List.
- [ ] Exam Taking Interface: Question palette, timer countdown, option selector, review flag, submit modal.
- [ ] Results and Detailed Solution page.
- [ ] Admin Portal: Subject management, Test Series builder, Excel Upload & Preview modal, Import history log.
- [ ] Wire up React Router routes and context providers.

### Phase 8: Testing, Verification & Production Deployment
- [ ] Run backend integration test suite.
- [ ] Run frontend production build check (`npm run build`).
- [ ] Configure Render deployment settings for `backend/`.
- [ ] Configure Vercel deployment settings for `frontend/`.
- [ ] Final end-to-end verification.
