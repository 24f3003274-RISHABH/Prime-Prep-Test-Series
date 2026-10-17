-- ============================================================================
-- PrimePrep: Database Schema Verification Script (Prompt 2 Architecture)
-- Target: Supabase PostgreSQL
-- Purpose: Verify tables, foreign keys, constraints, and seeds for Subject -> Chapter -> Test -> Question hierarchy.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CHECK 1: Verify Core Architecture Tables Exist
-- Expected Result: Exactly 10 rows returned for the core architecture tables
-- ----------------------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users',
    'subjects',
    'chapters',
    'tests',
    'questions',
    'test_questions',
    'attempts',
    'attempt_answers',
    'admin_audit_logs',
    'schema_migrations'
  )
ORDER BY table_name;


-- ----------------------------------------------------------------------------
-- CHECK 2: Verify Foreign Key Relationships for Subject -> Chapter -> Test -> Question
-- Expected Result: Foreign keys linking chapters->subjects, tests->chapters,
-- questions->subjects/chapters, test_questions->tests/questions,
-- attempts->users/tests, attempt_answers->attempts/questions, admin_audit_logs->users.
-- ----------------------------------------------------------------------------
SELECT
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'chapters', 'tests', 'questions', 'test_questions', 
    'attempts', 'attempt_answers', 'admin_audit_logs'
  )
ORDER BY source_table, source_column;


-- ----------------------------------------------------------------------------
-- CHECK 3: Verify the Seven Initial CUET PG Subjects
-- Expected Result: Exactly 7 active rows ordered by display_order
-- ----------------------------------------------------------------------------
SELECT display_order, name, slug, is_active
FROM subjects
ORDER BY display_order ASC;


-- ----------------------------------------------------------------------------
-- CHECK 4: Verify Unique Constraints
-- Expected Result: Unique constraints on users(email), subjects(slug),
-- test_questions(test_id, question_id), test_questions(test_id, question_order),
-- attempt_answers(attempt_id, question_id).
-- ----------------------------------------------------------------------------
SELECT
    tc.table_name,
    tc.constraint_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS unique_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('users', 'subjects', 'test_questions', 'attempt_answers')
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name, tc.constraint_name;


-- ----------------------------------------------------------------------------
-- CHECK 5: Verify Check Constraints
-- Expected Result: Check constraints enforcing roles, test_types, access_types,
-- correct_options (A, B, C, D), and attempt statuses.
-- ----------------------------------------------------------------------------
SELECT
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('users', 'tests', 'questions', 'attempts')
ORDER BY tc.table_name, tc.constraint_name;


-- ----------------------------------------------------------------------------
-- CHECK 6: Verify Applied Migrations Tracking
-- Expected Result: 10 rows showing applied migrations 001 through 010
-- ----------------------------------------------------------------------------
SELECT id, name, applied_at
FROM schema_migrations
ORDER BY id ASC;
