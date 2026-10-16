-- Migration: 005_seed_initial_configuration.sql
-- Description: Idempotently seed the 3 default test categories and 7 initial CUET PG subjects.

-- Ensure legacy code column in subjects allows NULL if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'code' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE subjects ALTER COLUMN code DROP NOT NULL;
    END IF;
END $$;

-- Seed default test categories
INSERT INTO test_categories (name, slug, description, default_test_count, is_active)
VALUES
    (
        'Sectional Test Series',
        'sectional',
        'Subject chapter-wise and module-wise practice tests.',
        15,
        TRUE
    ),
    (
        'Full-Length Test Series',
        'full-length',
        'Comprehensive mock examinations matching official NTA CUET PG duration and question pattern.',
        10,
        TRUE
    ),
    (
        'Previous Year Question (PYQ) Test Series',
        'pyq',
        'Authentic past examination papers with verified answer keys and detailed explanations.',
        5,
        TRUE
    )
ON CONFLICT (slug) DO UPDATE
SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_test_count = EXCLUDED.default_test_count,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Seed the 7 initial CUET PG subjects
INSERT INTO subjects (name, slug, paper_code, description, is_active)
VALUES
    (
        'Political Science',
        'political-science',
        'HUQP18',
        'CUET PG Political Science: Western & Indian Political Thought, International Relations, Comparative Politics, and Public Policy.',
        TRUE
    ),
    (
        'Philosophy',
        'philosophy',
        'HUQP16',
        'CUET PG Philosophy: Classical Indian Philosophy, Western Philosophy, Logic, Ethics, and Epistemology.',
        TRUE
    ),
    (
        'Psychology',
        'psychology',
        'HUQP20',
        'CUET PG Psychology: Cognitive Processes, Personality Theories, Biological Bases of Behavior, Social Psychology, and Research Methodology.',
        TRUE
    ),
    (
        'History',
        'history',
        'HUQP09',
        'CUET PG History: Ancient, Medieval, Modern Indian History, Historiography, and World History.',
        TRUE
    ),
    (
        'Economics',
        'economics',
        'COQP10',
        'CUET PG Economics: Microeconomics, Macroeconomics, Money and Banking, International Trade, Public Finance, and Econometrics.',
        TRUE
    ),
    (
        'Geography',
        'geography',
        'HUQP08',
        'CUET PG Geography: Geomorphology, Climatology, Oceanography, Human Geography, Economic Geography, and Geographic Information Systems.',
        TRUE
    ),
    (
        'Disaster Management',
        'disaster-management',
        'SCQP11',
        'CUET PG Disaster Management: Hazard Analysis, Risk Vulnerability Assessment, Climate Change Adaptation, and Emergency Planning.',
        TRUE
    )
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    paper_code = EXCLUDED.paper_code,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Synchronize code column if it exists in schema
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'code'
    ) THEN
        UPDATE subjects SET code = paper_code WHERE code IS NULL OR code != paper_code;
    END IF;
END $$;
