-- Migration: 010_seed_initial_subjects.sql
-- Description: Idempotently seed the 7 initial CUET PG subjects with ordered slugs.

INSERT INTO subjects (name, slug, description, display_order, is_active)
VALUES
    (
        'Political Science',
        'political-science',
        'CUET PG Political Science: Western & Indian Political Thought, International Relations, Comparative Politics, and Public Policy.',
        1,
        TRUE
    ),
    (
        'Philosophy',
        'philosophy',
        'CUET PG Philosophy: Classical Indian Philosophy, Western Philosophy, Logic, Ethics, and Epistemology.',
        2,
        TRUE
    ),
    (
        'Psychology',
        'psychology',
        'CUET PG Psychology: Cognitive Processes, Personality Theories, Biological Bases of Behavior, Social Psychology, and Research Methodology.',
        3,
        TRUE
    ),
    (
        'History',
        'history',
        'CUET PG History: Ancient, Medieval, Modern Indian History, Historiography, and World History.',
        4,
        TRUE
    ),
    (
        'Economics',
        'economics',
        'CUET PG Economics: Microeconomics, Macroeconomics, Money and Banking, International Trade, Public Finance, and Econometrics.',
        5,
        TRUE
    ),
    (
        'Geography',
        'geography',
        'CUET PG Geography: Geomorphology, Climatology, Oceanography, Human Geography, Economic Geography, and Geographic Information Systems.',
        6,
        TRUE
    ),
    (
        'Disaster Management',
        'disaster-management',
        'CUET PG Disaster Management: Hazard Analysis, Risk Vulnerability Assessment, Climate Change Adaptation, and Emergency Planning.',
        7,
        TRUE
    )
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
