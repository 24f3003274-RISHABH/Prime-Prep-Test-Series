-- Migration: 006_create_test_questions.sql
-- Description: Create test_questions table associating questions with tests with ordering and mark overrides.

CREATE TABLE IF NOT EXISTS test_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    question_order INT NOT NULL CHECK (question_order > 0),
    marks_override NUMERIC(5, 2) CHECK (marks_override IS NULL OR marks_override >= 0),
    negative_marks_override NUMERIC(5, 2) CHECK (negative_marks_override IS NULL OR negative_marks_override >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_test_questions_test_question UNIQUE (test_id, question_id),
    CONSTRAINT uq_test_questions_test_order UNIQUE (test_id, question_order)
);

-- Ensure columns exist if table pre-existed
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS question_order INT;
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS marks_override NUMERIC(5, 2);
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS negative_marks_override NUMERIC(5, 2);

-- Sync question_order from question_number if question_number exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_questions' AND column_name = 'question_number'
    ) THEN
        UPDATE test_questions SET question_order = question_number WHERE question_order IS NULL;
    END IF;
END $$;

-- Ensure unique constraints exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'test_questions' AND constraint_name = 'uq_test_questions_test_question'
    ) THEN
        ALTER TABLE test_questions ADD CONSTRAINT uq_test_questions_test_question UNIQUE (test_id, question_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'test_questions' AND constraint_name = 'uq_test_questions_test_order'
    ) THEN
        ALTER TABLE test_questions ADD CONSTRAINT uq_test_questions_test_order UNIQUE (test_id, question_order);
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_question_id ON test_questions(question_id);
