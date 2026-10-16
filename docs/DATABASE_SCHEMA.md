# PrimePrep Database Architecture (Supabase PostgreSQL)

This document specifies the database design, entity relationships, and constraints for the PrimePrep platform.

---

## 1. Core Hierarchy & Relational Model

The system organizes test content along a 4-level hierarchy:

```
[subjects]
    └── [test_series] (associated with [test_categories])
            └── [tests]
                    └── [test_questions] (ordering link to [questions])
```

### 1.1 The 12 Foundational Tables

1. **`subjects`**: Academic disciplines (Political Science, Philosophy, Psychology, History, Economics, Geography, Disaster Management). Includes slug, status (`active`, `inactive`), and default test quotas.
2. **`profiles`**: User profiles extending authentication with name, phone, student ID, and role (`student`, `admin`).
3. **`admin_users`**: Privileged administrators, created via one-time bootstrap with bcrypt-hashed passwords.
4. **`test_categories`**: Test categories (`Sectional`, `Full-Length`, `PYQ`).
5. **`test_series`**: Series grouping tests under a subject and category.
6. **`tests`**: Individual tests with duration (minutes), total marks, positive/negative marking rules, free/paid status, and published state.
7. **`questions`**: Reusable question repository containing question text, 4 options (A, B, C, D), correct option, explanation, and default marks.
8. **`test_questions`**: Junction table mapping questions into tests with explicit `order_index`.
9. **`test_attempts`**: Student test sessions with server-authoritative `started_at`, `submitted_at`, `status`, total score, and time taken.
10. **`attempt_responses`**: Student responses per question within an attempt (`selected_option`, `is_marked_for_review`, `is_correct`, `marks_awarded`).
11. **`import_history`**: Audit trail of Excel bulk imports (filename, rows parsed, valid rows, invalid rows, admin user, status).
12. **`audit_logs`**: Security logs recording sensitive operations (admin bootstrap, credential changes, test publishing).

---

## 2. Integrity & Constraint Rules

- **Zero Untrusted SQL:** All database interactions MUST use parameterized SQL (`$1, $2, ...`) via the Node `pg` client.
- **Single Attempt Rule:** A student can only submit a particular test once. Guaranteed via unique index: `CREATE UNIQUE INDEX idx_single_submitted_attempt ON test_attempts (user_id, test_id) WHERE status = 'submitted';`
- **Referential Integrity:** Cascade deletes where appropriate (e.g., deleting a draft test removes `test_questions`), but restrict deletion on active subjects with existing attempts.
- **Atomic Imports:** Excel bulk imports must run inside an explicit `BEGIN ... COMMIT` database transaction to prevent partial state on error.

---

## 3. Supabase Connection Configuration

In Phase 2, connect your Supabase database by obtaining the connection string:
1. Log in to [Supabase](https://supabase.com/dashboard).
2. Go to **Project Settings** -> **Database**.
3. Under **Connection string**, select **Node.js** or **URI**.
4. Use either:
   - **Transaction Pooler (Port 6543):** Ideal for serverless or Render deployments.
   - **Direct Session (Port 5432):** Standard PostgreSQL connection.
5. Paste into `backend/.env` as `DATABASE_URL`.
