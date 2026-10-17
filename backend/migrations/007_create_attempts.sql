-- Migration: 007_create_attempts.sql
-- Description: Create attempts table tracking student test attempts, timestamps, score statistics, and time taken.

-- If attempts existed as a legacy view, replace it with the dedicated attempts table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'attempts' AND c.relkind = 'v'
    ) THEN
        DROP VIEW public.attempts CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE RESTRICT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'expired')),
    total_questions INT NOT NULL DEFAULT 0 CHECK (total_questions >= 0),
    attempted_questions INT NOT NULL DEFAULT 0 CHECK (attempted_questions >= 0),
    correct_answers INT NOT NULL DEFAULT 0 CHECK (correct_answers >= 0),
    incorrect_answers INT NOT NULL DEFAULT 0 CHECK (incorrect_answers >= 0),
    unanswered_questions INT NOT NULL DEFAULT 0 CHECK (unanswered_questions >= 0),
    score NUMERIC(6, 2),
    time_taken_seconds INT CHECK (time_taken_seconds IS NULL OR time_taken_seconds >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist if table pre-existed
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS total_questions INT NOT NULL DEFAULT 0;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS attempted_questions INT NOT NULL DEFAULT 0;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS correct_answers INT NOT NULL DEFAULT 0;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS incorrect_answers INT NOT NULL DEFAULT 0;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS unanswered_questions INT NOT NULL DEFAULT 0;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS time_taken_seconds INT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test_id ON attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON attempts(status);
