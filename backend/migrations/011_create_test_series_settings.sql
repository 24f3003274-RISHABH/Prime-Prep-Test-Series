-- Migration: 011_create_test_series_settings.sql
-- Description: Create test_series_settings table for configurable chapter test quotas and defaults.

CREATE TABLE IF NOT EXISTS test_series_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('sectional', 'full_length', 'pyq')),
    target_count INT NOT NULL DEFAULT 0 CHECK (target_count >= 0),
    default_duration_minutes INT NOT NULL DEFAULT 30 CHECK (default_duration_minutes > 0),
    default_positive_marks NUMERIC(5, 2) NOT NULL DEFAULT 4.00 CHECK (default_positive_marks >= 0),
    default_negative_marks NUMERIC(5, 2) NOT NULL DEFAULT 1.00 CHECK (default_negative_marks >= 0),
    free_test_count INT NOT NULL DEFAULT 0 CHECK (free_test_count >= 0),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_test_series_settings_chapter_type UNIQUE (chapter_id, test_type)
);

CREATE INDEX IF NOT EXISTS idx_test_series_settings_chapter ON test_series_settings(chapter_id);
