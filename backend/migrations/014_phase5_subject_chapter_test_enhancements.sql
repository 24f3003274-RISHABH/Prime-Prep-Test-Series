-- Migration: 014_phase5_subject_chapter_test_enhancements.sql
-- Description: Add publication_status, test_number, unique constraints, and global test_series_settings

DO $$
BEGIN
  -- 1. Add publication_status to subjects if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'publication_status'
  ) THEN
    ALTER TABLE public.subjects
    ADD COLUMN publication_status VARCHAR(20) DEFAULT 'published';

    ALTER TABLE public.subjects
    ADD CONSTRAINT chk_subjects_publication_status
    CHECK (publication_status IN ('draft', 'published', 'archived'));

    UPDATE public.subjects
    SET publication_status = CASE WHEN is_active THEN 'published' ELSE 'archived' END;
  END IF;

  -- 2. Add publication_status to chapters if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chapters' AND column_name = 'publication_status'
  ) THEN
    ALTER TABLE public.chapters
    ADD COLUMN publication_status VARCHAR(20) DEFAULT 'published';

    ALTER TABLE public.chapters
    ADD CONSTRAINT chk_chapters_publication_status
    CHECK (publication_status IN ('draft', 'published', 'archived'));

    UPDATE public.chapters
    SET publication_status = CASE WHEN is_active THEN 'published' ELSE 'archived' END;
  END IF;

  -- 3. Add test_number and publication_status to tests if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tests' AND column_name = 'test_number'
  ) THEN
    ALTER TABLE public.tests
    ADD COLUMN test_number INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tests' AND column_name = 'publication_status'
  ) THEN
    ALTER TABLE public.tests
    ADD COLUMN publication_status VARCHAR(20) DEFAULT 'draft';

    ALTER TABLE public.tests
    ADD CONSTRAINT chk_tests_publication_status
    CHECK (publication_status IN ('draft', 'published', 'archived'));

    UPDATE public.tests
    SET publication_status = CASE WHEN is_published THEN 'published' ELSE 'draft' END;
  END IF;

  -- 4. Add unique constraint on (chapter_id, test_type, test_number) for tests
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'tests' AND constraint_name = 'uq_tests_chapter_type_number'
  ) THEN
    -- Ensure any existing null test_numbers don't conflict, then add unique constraint
    ALTER TABLE public.tests
    ADD CONSTRAINT uq_tests_chapter_type_number
    UNIQUE (chapter_id, test_type, test_number);
  END IF;

  -- 5. Modify test_series_settings to allow NULL chapter_id for global defaults
  ALTER TABLE public.test_series_settings
  ALTER COLUMN chapter_id DROP NOT NULL;

  -- Unique index for global settings where chapter_id IS NULL
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'test_series_settings' AND indexname = 'uq_global_test_series_settings'
  ) THEN
    CREATE UNIQUE INDEX uq_global_test_series_settings
    ON public.test_series_settings (test_type)
    WHERE chapter_id IS NULL;
  END IF;

  -- Seed initial global test_series_settings defaults if not already present
  INSERT INTO public.test_series_settings (
    chapter_id, test_type, target_count, default_duration_minutes,
    default_positive_marks, default_negative_marks, free_test_count, updated_at
  )
  VALUES
    (NULL, 'sectional', 15, 30, 4.00, 1.00, 1, NOW()),
    (NULL, 'full_length', 10, 90, 4.00, 1.00, 0, NOW()),
    (NULL, 'pyq', 5, 90, 4.00, 1.00, 1, NOW())
  ON CONFLICT DO NOTHING;

END $$;
