-- Migration: 005_create_questions.sql
-- Description: Create questions bank table belonging to subjects and chapters with 4 options and correct option validation.

CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    chapter_id UUID REFERENCES chapters(id) ON DELETE RESTRICT,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option VARCHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    explanation TEXT,
    positive_marks NUMERIC(5, 2) NOT NULL DEFAULT 4.00 CHECK (positive_marks >= 0),
    negative_marks NUMERIC(5, 2) NOT NULL DEFAULT 1.00 CHECK (negative_marks >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table pre-existed
ALTER TABLE questions ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES chapters(id) ON DELETE RESTRICT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS positive_marks NUMERIC(5, 2) NOT NULL DEFAULT 4.00;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS negative_marks NUMERIC(5, 2) NOT NULL DEFAULT 1.00;

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_chapter_id ON questions(chapter_id);
