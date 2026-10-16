-- Migration: 002_create_test_content_tables.sql
-- Description: Create test_series, tests, questions, and test_questions tables.

-- Table: test_series (Grouping tests belonging to a subject and category)
CREATE TABLE IF NOT EXISTS test_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES test_categories(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    access_type VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (access_type IN ('free', 'paid')),
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: tests (Individual exam papers within a series)
CREATE TABLE IF NOT EXISTS tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_series_id UUID REFERENCES test_series(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL DEFAULT 105 CHECK (duration_minutes > 0),
    total_questions INT NOT NULL DEFAULT 0 CHECK (total_questions >= 0),
    positive_marks NUMERIC(5, 2) NOT NULL DEFAULT 4.00 CHECK (positive_marks >= 0),
    negative_marks NUMERIC(5, 2) NOT NULL DEFAULT 1.00 CHECK (negative_marks >= 0),
    display_order INT NOT NULL DEFAULT 0,
    access_type VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (access_type IN ('free', 'paid')),
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist if tests table pre-existed
ALTER TABLE tests ADD COLUMN IF NOT EXISTS test_series_id UUID REFERENCES test_series(id) ON DELETE RESTRICT;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 105;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS positive_marks NUMERIC(5, 2) NOT NULL DEFAULT 4.00;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS negative_marks NUMERIC(5, 2) NOT NULL DEFAULT 1.00;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;

-- Table: questions (Question bank repository per subject)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option VARCHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    explanation TEXT,
    default_positive_marks NUMERIC(5, 2) NOT NULL DEFAULT 4.00 CHECK (default_positive_marks >= 0),
    default_negative_marks NUMERIC(5, 2) NOT NULL DEFAULT 1.00 CHECK (default_negative_marks >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure question marks columns exist if questions pre-existed
ALTER TABLE questions ADD COLUMN IF NOT EXISTS default_positive_marks NUMERIC(5, 2) NOT NULL DEFAULT 4.00;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS default_negative_marks NUMERIC(5, 2) NOT NULL DEFAULT 1.00;

-- Ensure check constraint on correct_option exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'questions' AND column_name = 'correct_option'
    ) THEN
        ALTER TABLE questions ADD CONSTRAINT chk_questions_correct_option CHECK (correct_option IN ('A', 'B', 'C', 'D'));
    END IF;
END $$;

-- Table: test_questions (Mapping questions into tests with deterministic ordering)
CREATE TABLE IF NOT EXISTS test_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    question_number INT NOT NULL CHECK (question_number > 0),
    positive_marks NUMERIC(5, 2) CHECK (positive_marks IS NULL OR positive_marks >= 0),
    negative_marks NUMERIC(5, 2) CHECK (negative_marks IS NULL OR negative_marks >= 0),
    time_limit_seconds INT CHECK (time_limit_seconds IS NULL OR time_limit_seconds > 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_test_question_number UNIQUE (test_id, question_number),
    CONSTRAINT uq_test_question_id UNIQUE (test_id, question_id)
);

ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS question_number INT;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_questions' AND column_name = 'question_order'
    ) THEN
        UPDATE test_questions SET question_number = question_order WHERE question_number IS NULL;
    END IF;
END $$;

-- Ensure unique constraints exist on test_questions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'test_questions' AND constraint_name = 'uq_test_question_number'
    ) THEN
        ALTER TABLE test_questions ADD CONSTRAINT uq_test_question_number UNIQUE (test_id, question_number);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'test_questions' AND constraint_name = 'uq_test_question_id'
    ) THEN
        ALTER TABLE test_questions ADD CONSTRAINT uq_test_question_id UNIQUE (test_id, question_id);
    END IF;
END $$;

-- Content Indexes
CREATE INDEX IF NOT EXISTS idx_test_series_subject_id ON test_series(subject_id);
CREATE INDEX IF NOT EXISTS idx_test_series_category_id ON test_series(category_id);
CREATE INDEX IF NOT EXISTS idx_test_series_published ON test_series(is_published);
CREATE INDEX IF NOT EXISTS idx_tests_test_series_id ON tests(test_series_id);
CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status);
CREATE INDEX IF NOT EXISTS idx_tests_published ON tests(is_published);
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_question_id ON test_questions(question_id);
