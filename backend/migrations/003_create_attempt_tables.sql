-- Migration: 003_create_attempt_tables.sql
-- Description: Create test_attempts and attempt_responses tables with single-attempt enforcement.

-- Table: test_attempts (Student test sessions with server-authoritative timer)
CREATE TABLE IF NOT EXISTS test_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE RESTRICT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'expired')),
    score NUMERIC(6, 2),
    total_questions INT NOT NULL DEFAULT 0 CHECK (total_questions >= 0),
    attempted_questions INT NOT NULL DEFAULT 0 CHECK (attempted_questions >= 0),
    correct_answers INT NOT NULL DEFAULT 0 CHECK (correct_answers >= 0),
    incorrect_answers INT NOT NULL DEFAULT 0 CHECK (incorrect_answers >= 0),
    unanswered_questions INT NOT NULL DEFAULT 0 CHECK (unanswered_questions >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_test_attempt UNIQUE (student_id, test_id)
);

-- Ensure all attempt counter columns exist if test_attempts pre-existed
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS total_questions INT NOT NULL DEFAULT 0;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS attempted_questions INT NOT NULL DEFAULT 0;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS correct_answers INT NOT NULL DEFAULT 0;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS incorrect_answers INT NOT NULL DEFAULT 0;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS unanswered_questions INT NOT NULL DEFAULT 0;

-- Ensure unique constraint on single student attempt exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'test_attempts' AND constraint_name = 'uq_student_test_attempt'
    ) THEN
        ALTER TABLE test_attempts ADD CONSTRAINT uq_student_test_attempt UNIQUE (student_id, test_id);
    END IF;
END $$;

-- Table: attempt_responses (Individual question answers and review flags per attempt)
CREATE TABLE IF NOT EXISTS attempt_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    selected_option VARCHAR(1) CHECK (selected_option IS NULL OR selected_option IN ('A', 'B', 'C', 'D')),
    is_marked_for_review BOOLEAN NOT NULL DEFAULT FALSE,
    answered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id)
);

-- Ensure is_marked_for_review exists if table pre-existed
ALTER TABLE attempt_responses ADD COLUMN IF NOT EXISTS is_marked_for_review BOOLEAN NOT NULL DEFAULT FALSE;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attempt_responses' AND column_name = 'marked_for_review'
    ) THEN
        UPDATE attempt_responses SET is_marked_for_review = marked_for_review WHERE is_marked_for_review IS FALSE;
    END IF;
END $$;

-- Ensure unique constraint on attempt and question exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'attempt_responses' AND constraint_name = 'uq_attempt_question'
    ) THEN
        ALTER TABLE attempt_responses ADD CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id);
    END IF;
END $$;

-- Attempt Indexes
CREATE INDEX IF NOT EXISTS idx_test_attempts_student_id ON test_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_id ON test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_status ON test_attempts(status);
CREATE INDEX IF NOT EXISTS idx_attempt_responses_attempt_id ON attempt_responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_responses_question_id ON attempt_responses(question_id);
