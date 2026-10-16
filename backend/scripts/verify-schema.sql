-- ============================================================================
-- PrimePrep: Database Schema Verification Script
-- Target: Supabase PostgreSQL
-- Purpose: Verify that all tables, foreign keys, constraints, and seeds are present.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CHECK 1: Verify that all 12 core tables (plus schema_migrations) exist
-- Expected Result: Exactly 13 rows returned with table_type = 'BASE TABLE'
-- ----------------------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users',
    'profiles',
    'subjects',
    'test_categories',
    'test_series',
    'tests',
    'questions',
    'test_questions',
    'test_attempts',
    'attempt_responses',
    'import_history',
    'audit_logs',
    'schema_migrations'
  )
ORDER BY table_name;


-- ----------------------------------------------------------------------------
-- CHECK 2: Verify Foreign Key Relationships
-- Expected Result: 13 foreign key constraints linking profiles, series, tests,
-- questions, attempts, responses, imports, and audit logs.
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
ORDER BY source_table, source_column;


-- ----------------------------------------------------------------------------
-- CHECK 3: Verify the Seven Initial CUET PG Subjects
-- Expected Result: Exactly 7 active rows returned with their official slugs
-- ----------------------------------------------------------------------------
SELECT name, slug, paper_code, is_active
FROM subjects
ORDER BY name;


-- ----------------------------------------------------------------------------
-- CHECK 4: Verify the Three Default Test Categories
-- Expected Result: Exactly 3 rows: 'sectional', 'full-length', 'pyq'
-- ----------------------------------------------------------------------------
SELECT name, slug, default_test_count, is_active
FROM test_categories
ORDER BY slug;


-- ----------------------------------------------------------------------------
-- CHECK 5: Verify Category Default Quotas (15 Sectional, 10 Full-Length, 5 PYQ)
-- Expected Result: Exactly 3 rows matching the specified counts
-- ----------------------------------------------------------------------------
SELECT
    slug,
    default_test_count,
    CASE
        WHEN slug = 'sectional' AND default_test_count = 15 THEN 'VALID'
        WHEN slug = 'full-length' AND default_test_count = 10 THEN 'VALID'
        WHEN slug = 'pyq' AND default_test_count = 5 THEN 'VALID'
        ELSE 'MISCONFIGURED'
    END AS status
FROM test_categories
WHERE slug IN ('sectional', 'full-length', 'pyq');


-- ----------------------------------------------------------------------------
-- CHECK 6: Verify Unique Constraint on Single Student Attempt per Test
-- Expected Result: 1 row returned showing constraint uq_student_test_attempt on test_attempts (student_id, test_id)
-- ----------------------------------------------------------------------------
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'test_attempts'
  AND tc.constraint_type = 'UNIQUE'
ORDER BY kcu.ordinal_position;


-- ----------------------------------------------------------------------------
-- CHECK 7: Verify Deterministic Ordering Constraint on test_questions
-- Expected Result: 2 unique constraints: (test_id, question_number) and (test_id, question_id)
-- ----------------------------------------------------------------------------
SELECT
    tc.table_name,
    tc.constraint_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS unique_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'test_questions'
  AND tc.constraint_type = 'UNIQUE'
GROUP BY tc.table_name, tc.constraint_name;


-- ----------------------------------------------------------------------------
-- CHECK 8: Verify Question Options Check Constraint (A, B, C, D only)
-- Expected Result: Check constraint enforcing correct_option IN ('A', 'B', 'C', 'D')
-- ----------------------------------------------------------------------------
SELECT
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'questions'
  AND cc.check_clause LIKE '%correct_option%';
