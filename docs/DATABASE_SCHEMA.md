# PrimePrep Database Architecture (Supabase PostgreSQL)

This document specifies the PostgreSQL relational database schema, integrity constraints, and migration instructions for **PrimePrep**, a CUET PG test preparation platform.

---

## 1. Domain Hierarchy

The system organizes academic and testing content in a strict 4-level hierarchy:

```
Subject (e.g., Political Science)
  └── Chapters (e.g., Western Political Thought)
       └── Tests (e.g., Plato & Aristotle Sectional Test)
            └── Test Questions (Deterministic ordering & mark overrides)
                 └── Questions (Reusable question bank)
```

Student attempts and administrative audit trails attach cleanly to this hierarchy:
```
User (Student / Admin)
  ├── Attempts (Timed test sessions)
  │    └── Attempt Answers (Selected options, marked-for-review flags, score)
  └── Admin Audit Logs (Administrative actions audit trail)
```

---

## 2. Table Specifications & Column Definitions

### 2.1 `users`
Application authentication identities and role management.
- `id` (UUID, PK, `DEFAULT gen_random_uuid()`): Unique user identifier.
- `full_name` (VARCHAR(150), NOT NULL): User's legal/display name.
- `email` (VARCHAR(255), UNIQUE, NOT NULL): Normalized user email.
- `password_hash` (VARCHAR(255), NOT NULL): Bcrypt-hashed password.
- `role` (VARCHAR(20), NOT NULL, `DEFAULT 'student'`): Account role (`CHECK (role IN ('student', 'admin'))`).
- `is_active` (BOOLEAN, NOT NULL, `DEFAULT TRUE`): Account activation flag.
- `created_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Timestamp created.
- `updated_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Timestamp modified.
- **Indexes:** `idx_users_email`, `idx_users_role`, `idx_users_is_active`.

### 2.2 `subjects`
CUET PG examination disciplines.
- `id` (UUID, PK, `DEFAULT gen_random_uuid()`): Unique subject identifier.
- `name` (VARCHAR(150), NOT NULL): Subject name (e.g. Political Science).
- `slug` (VARCHAR(150), UNIQUE, NOT NULL): URL-safe slug (e.g. `political-science`).
- `description` (TEXT): Overview of the subject syllabus.
- `display_order` (INT, NOT NULL, `DEFAULT 0`): Ordering sequence for navigation.
- `is_active` (BOOLEAN, NOT NULL, `DEFAULT TRUE`): Subject publication toggle.
- `created_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Timestamp created.
- `updated_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Timestamp modified.
- **Indexes:** `idx_subjects_slug`, `idx_subjects_display_order`, `idx_subjects_is_active`.

### 2.3 `chapters`
Curriculum modules and chapters within a specific subject.
- `id` (UUID, PK, `DEFAULT gen_random_uuid()`): Unique chapter identifier.
- `subject_id` (UUID, NOT NULL, `REFERENCES subjects(id) ON DELETE RESTRICT`): Parent subject.
- `name` (VARCHAR(200), NOT NULL): Chapter title.
- `description` (TEXT): Chapter description and learning objectives.
- `display_order` (INT, NOT NULL, `DEFAULT 0`): Ordering sequence within subject.
- `is_active` (BOOLEAN, NOT NULL, `DEFAULT TRUE`): Chapter visibility toggle.
- `created_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Timestamp created.
- `updated_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Timestamp modified.
- **Indexes:** `idx_chapters_subject_id`, `idx_chapters_display_order`, `idx_chapters_is_active`.

### 2.4 `tests`
Individual mock tests and examinations belonging to a chapter.
- `id` (UUID, PK, `DEFAULT gen_random_uuid()`): Unique test identifier.
- `chapter_id` (UUID, NOT NULL, `REFERENCES chapters(id) ON DELETE RESTRICT`): Parent chapter.
- `title` (VARCHAR(200), NOT NULL): Title of the test.
- `description` (TEXT): Detailed test guidelines and syllabus coverage.
- `test_type` (VARCHAR(20), NOT NULL, `CHECK (test_type IN ('sectional', 'full_length', 'pyq'))`): Category.
- `duration_minutes` (INT, NOT NULL, `CHECK (duration_minutes > 0)`): Server-enforced test duration.
- `positive_marks` (NUMERIC(5, 2), NOT NULL, `DEFAULT 4.00`, `CHECK (positive_marks >= 0)`): Marks for correct answer.
- `negative_marks` (NUMERIC(5, 2), NOT NULL, `DEFAULT 1.00`, `CHECK (negative_marks >= 0)`): Marks deducted for wrong answer.
- `access_type` (VARCHAR(20), NOT NULL, `DEFAULT 'paid'`, `CHECK (access_type IN ('free', 'paid'))`): Monetization status.
- `max_attempts` (INT, NOT NULL, `DEFAULT 1`, `CHECK (max_attempts > 0)`): Allowed attempts per student.
- `is_published` (BOOLEAN, NOT NULL, `DEFAULT FALSE`): Availability toggle for students.
- `display_order` (INT, NOT NULL, `DEFAULT 0`): Display order.
- `created_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Timestamp created.
- `updated_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Timestamp modified.
- **Indexes:** `idx_tests_chapter_id`, `idx_tests_test_type`, `idx_tests_access_type`, `idx_tests_is_published`, `idx_tests_display_order`.

### 2.5 `questions`
Reusable question bank attached to subjects and chapters.
- `id` (UUID, PK, `DEFAULT gen_random_uuid()`): Unique question identifier.
- `subject_id` (UUID, NOT NULL, `REFERENCES subjects(id) ON DELETE RESTRICT`): Subject category.
- `chapter_id` (UUID, `REFERENCES chapters(id) ON DELETE RESTRICT`): Chapter category.
- `question_text` (TEXT, NOT NULL): The full question statement.
- `option_a` (TEXT, NOT NULL): First multiple choice option.
- `option_b` (TEXT, NOT NULL): Second multiple choice option.
- `option_c` (TEXT, NOT NULL): Third multiple choice option.
- `option_d` (TEXT, NOT NULL): Fourth multiple choice option.
- `correct_option` (VARCHAR(1), NOT NULL, `CHECK (correct_option IN ('A', 'B', 'C', 'D'))`): Verified answer key.
- `explanation` (TEXT): Detailed explanation/solution. Never exposed before submission.
- `positive_marks` (NUMERIC(5, 2), NOT NULL, `DEFAULT 4.00`, `CHECK (positive_marks >= 0)`): Default correct mark.
- `negative_marks` (NUMERIC(5, 2), NOT NULL, `DEFAULT 1.00`, `CHECK (negative_marks >= 0)`): Default negative mark.
- `created_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Timestamp created.
- `updated_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Timestamp modified.
- **Indexes:** `idx_questions_subject_id`, `idx_questions_chapter_id`.

### 2.6 `test_questions`
Junction table linking questions into tests with deterministic sequence and test-specific mark overrides.
- `id` (UUID, PK, `DEFAULT gen_random_uuid()`): Unique mapping identifier.
- `test_id` (UUID, NOT NULL, `REFERENCES tests(id) ON DELETE CASCADE`): Target test.
- `question_id` (UUID, NOT NULL, `REFERENCES questions(id) ON DELETE RESTRICT`): Attached question.
- `question_order` (INT, NOT NULL, `CHECK (question_order > 0)`): 1-based question number in test.
- `marks_override` (NUMERIC(5, 2), `CHECK (marks_override IS NULL OR marks_override >= 0)`): Test-specific positive marks.
- `negative_marks_override` (NUMERIC(5, 2), `CHECK (negative_marks_override IS NULL OR negative_marks_override >= 0)`): Test-specific negative marks.
- `created_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Timestamp created.
- **Constraints:**
  - `uq_test_questions_test_question UNIQUE (test_id, question_id)`: Prevents attaching duplicate question to test.
  - `uq_test_questions_test_order UNIQUE (test_id, question_order)`: Prevents collision of question order in test.
- **Indexes:** `idx_test_questions_test_id`, `idx_test_questions_question_id`.

### 2.7 `attempts`
Student test sessions with server-authoritative timer and calculated score statistics.
- `id` (UUID, PK, `DEFAULT gen_random_uuid()`): Unique attempt session identifier.
- `user_id` (UUID, NOT NULL, `REFERENCES users(id) ON DELETE CASCADE`): Student who took the test.
- `test_id` (UUID, NOT NULL, `REFERENCES tests(id) ON DELETE RESTRICT`): The test attempted.
- `started_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Official start time.
- `submitted_at` (TIMESTAMPTZ): Final submission timestamp.
- `status` (VARCHAR(20), NOT NULL, `DEFAULT 'in_progress'`, `CHECK (status IN ('in_progress', 'submitted', 'expired'))`): State.
- `total_questions` (INT, NOT NULL, `DEFAULT 0`): Number of questions in paper.
- `attempted_questions` (INT, NOT NULL, `DEFAULT 0`): Answered questions count.
- `correct_answers` (INT, NOT NULL, `DEFAULT 0`): Correctly answered count.
- `incorrect_answers` (INT, NOT NULL, `DEFAULT 0`): Wrongly answered count.
- `unanswered_questions` (INT, NOT NULL, `DEFAULT 0`): Unanswered questions count.
- `score` (NUMERIC(6, 2)): Final calculated score.
- `time_taken_seconds` (INT, `CHECK (time_taken_seconds IS NULL OR time_taken_seconds >= 0)`): Duration spent.
- `created_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Timestamp created.
- `updated_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Timestamp modified.
- **Indexes:** `idx_attempts_user_id`, `idx_attempts_test_id`, `idx_attempts_status`.

### 2.8 `attempt_answers`
Student responses per question in an attempt session.
- `id` (UUID, PK, `DEFAULT gen_random_uuid()`): Unique answer record identifier.
- `attempt_id` (UUID, NOT NULL, `REFERENCES attempts(id) ON DELETE CASCADE`): Associated attempt.
- `question_id` (UUID, NOT NULL, `REFERENCES questions(id) ON DELETE RESTRICT`): Question answered.
- `selected_option` (VARCHAR(1), `CHECK (selected_option IS NULL OR selected_option IN ('A', 'B', 'C', 'D'))`): Selected choice.
- `is_marked_for_review` (BOOLEAN, NOT NULL, `DEFAULT FALSE`): Flagged for later review by student.
- `is_correct` (BOOLEAN): Evaluated correctness after submission.
- `marks_awarded` (NUMERIC(5, 2)): Marks computed for this question.
- `answered_at` (TIMESTAMPTZ): Timestamp when student selected/updated choice.
- `created_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Timestamp created.
- `updated_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Timestamp modified.
- **Constraints:**
  - `uq_attempt_answers_attempt_question UNIQUE (attempt_id, question_id)`: Exactly one answer record per question in an attempt.
- **Indexes:** `idx_attempt_answers_attempt_id`, `idx_attempt_answers_question_id`.

### 2.9 `admin_audit_logs`
Immutable administrative audit log.
- `id` (UUID, PK, `DEFAULT gen_random_uuid()`): Unique audit record identifier.
- `admin_user_id` (UUID, `REFERENCES users(id) ON DELETE SET NULL`): Admin who performed action.
- `action` (VARCHAR(100), NOT NULL): Action identifier (e.g. `SUBJECT_CREATED`, `TEST_PUBLISHED`).
- `entity_type` (VARCHAR(50), NOT NULL): Entity category (`subject`, `chapter`, `test`, `question`).
- `entity_id` (UUID): Identifier of modified entity.
- `details` (JSONB, `DEFAULT '{}'::jsonb`): Action metadata (zero passwords, keys, or tokens).
- `created_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Event timestamp.
- **Indexes:** `idx_admin_audit_logs_admin_id`, `idx_admin_audit_logs_action`, `idx_admin_audit_logs_entity`, `idx_admin_audit_logs_created_at`.

### 2.10 `schema_migrations`
Tracking table ensuring each migration runs exactly once.
- `id` (SERIAL, PK): Execution sequence number.
- `name` (VARCHAR(255), UNIQUE, NOT NULL): Migration filename.
- `applied_at` (TIMESTAMPTZ, NOT NULL, `DEFAULT NOW()`): Timestamp when applied.

---

## 3. Seed Configuration (Initial 7 CUET PG Subjects)

The database is pre-seeded with the 7 initial subjects:
1. **Political Science** (`slug: political-science`, `display_order: 1`)
2. **Philosophy** (`slug: philosophy`, `display_order: 2`)
3. **Psychology** (`slug: psychology`, `display_order: 3`)
4. **History** (`slug: history`, `display_order: 4`)
5. **Economics** (`slug: economics`, `display_order: 5`)
6. **Geography** (`slug: geography`, `display_order: 6`)
7. **Disaster Management** (`slug: disaster-management`, `display_order: 7`)

---

## 4. How to Apply Migrations to Supabase

### Method 1: Using the CLI Migration Runner (Recommended)
Run directly from your terminal (uses `DATABASE_URL` configured in `backend/.env`):
```bash
npm run db:migrate
```
To verify the schema:
```bash
npm run db:verify
```

### Method 2: Supabase Web Dashboard SQL Editor
1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project and click **SQL Editor**.
3. Open `backend/scripts/verify-schema.sql` and run all check queries to verify table creation and constraints.
