-- Migration: 008_create_attempt_answers.sql
-- Description: Create attempt_answers table recording individual question responses, review flags, and marks.

CREATE TABLE IF NOT EXISTS attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    selected_option VARCHAR(1) CHECK (selected_option IS NULL OR selected_option IN ('A', 'B', 'C', 'D')),
    is_marked_for_review BOOLEAN NOT NULL DEFAULT FALSE,
    is_correct BOOLEAN,
    marks_awarded NUMERIC(5, 2),
    answered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attempt_answers_attempt_question UNIQUE (attempt_id, question_id)
);

-- Ensure all columns exist if table pre-existed
ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS is_marked_for_review BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;
ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS marks_awarded NUMERIC(5, 2);
ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS answered_at TIMESTAMP WITH TIME ZONE;

-- Ensure unique constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'attempt_answers' AND constraint_name = 'uq_attempt_answers_attempt_question'
    ) THEN
        ALTER TABLE attempt_answers ADD CONSTRAINT uq_attempt_answers_attempt_question UNIQUE (attempt_id, question_id);
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id ON attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_question_id ON attempt_answers(question_id);
