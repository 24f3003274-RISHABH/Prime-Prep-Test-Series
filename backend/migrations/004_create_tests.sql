-- Migration: 004_create_tests.sql
-- Description: Create tests table belonging to chapters with configurable duration, marks, and access types.

CREATE TABLE IF NOT EXISTS tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID REFERENCES chapters(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    test_type VARCHAR(20) NOT NULL DEFAULT 'sectional' CHECK (test_type IN ('sectional', 'full_length', 'pyq')),
    duration_minutes INT NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
    positive_marks NUMERIC(5, 2) NOT NULL DEFAULT 4.00 CHECK (positive_marks >= 0),
    negative_marks NUMERIC(5, 2) NOT NULL DEFAULT 1.00 CHECK (negative_marks >= 0),
    access_type VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (access_type IN ('free', 'paid')),
    max_attempts INT NOT NULL DEFAULT 1 CHECK (max_attempts > 0),
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table pre-existed
ALTER TABLE tests ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES chapters(id) ON DELETE RESTRICT;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS test_type VARCHAR(20) NOT NULL DEFAULT 'sectional';
ALTER TABLE tests ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 30;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS positive_marks NUMERIC(5, 2) NOT NULL DEFAULT 4.00;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS negative_marks NUMERIC(5, 2) NOT NULL DEFAULT 1.00;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS access_type VARCHAR(20) NOT NULL DEFAULT 'paid';
ALTER TABLE tests ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 1;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;

-- Ensure constraints exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'tests' AND column_name = 'test_type'
    ) THEN
        ALTER TABLE tests ADD CONSTRAINT chk_tests_test_type CHECK (test_type IN ('sectional', 'full_length', 'pyq'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'tests' AND column_name = 'access_type'
    ) THEN
        ALTER TABLE tests ADD CONSTRAINT chk_tests_access_type CHECK (access_type IN ('free', 'paid'));
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tests_chapter_id ON tests(chapter_id);
CREATE INDEX IF NOT EXISTS idx_tests_test_type ON tests(test_type);
CREATE INDEX IF NOT EXISTS idx_tests_access_type ON tests(access_type);
CREATE INDEX IF NOT EXISTS idx_tests_is_published ON tests(is_published);
CREATE INDEX IF NOT EXISTS idx_tests_display_order ON tests(display_order);
