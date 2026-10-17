-- Migration: 003_create_chapters.sql
-- Description: Create chapters table linked to subjects for modular curriculum organization.

CREATE TABLE IF NOT EXISTS chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure name column exists if table pre-existed with title
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS name VARCHAR(200);
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chapters' AND column_name = 'title'
    ) THEN
        UPDATE chapters SET name = title WHERE name IS NULL AND title IS NOT NULL;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_chapters_display_order ON chapters(display_order);
CREATE INDEX IF NOT EXISTS idx_chapters_is_active ON chapters(is_active);
