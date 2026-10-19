-- Migration: 015_seed_cuet_pg_chapters_and_tests.sql
-- Description: Idempotently seed standard CUET PG chapters, test series, and sample questions
-- for the 7 official subjects (Political Science, Philosophy, Psychology, History, Economics, Geography, Disaster Management).

DO $$
DECLARE
    rec_subj RECORD;
    v_chap_id UUID;
    v_test_id UUID;
    v_q_id UUID;
    v_admin_id UUID;
BEGIN
    SELECT id INTO v_admin_id FROM public.users WHERE role = 'admin' LIMIT 1;

    -- ==========================================
    -- 1. POLITICAL SCIENCE (HUQP18)
    -- ==========================================
    FOR rec_subj IN SELECT id, slug FROM subjects WHERE slug = 'political-science' LIMIT 1 LOOP
        -- Chapter 1
        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Western Political Thought', 'Chapter 1: Western Political Thought', 'western-political-thought', 'Plato, Aristotle, Machiavelli, Hobbes, Locke, Rousseau, Mill, Marx, Gramsci, and Rawls.', 1, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE
        RETURNING id INTO v_chap_id;

        -- Sectional Test 1
        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'Sectional Test 1: Classical Political Thought', 'ps-ch1-sec-1', 'Foundations of classical western political thought from Plato to Aristotle.', 'sectional', 1, 45, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        -- Starter Question for Sectional Test 1
        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'Who among the following propounded the theory of the Philosopher King in "The Republic"?', 'Aristotle', 'Plato', 'Socrates', 'Thrasymachus', 'B', 'Plato articulated the concept of the Philosopher King in Republic Book V as the ideal ruler guided by reason and episteme.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- Full-Length Test 1
        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'Full-Length Mock Test 1: Political Science', 'ps-flt-1', 'Comprehensive full-length mock covering all CUET PG Political Science syllabus units.', 'full_length', 1, 105, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'Which constitutional amendment made elementary education a Fundamental Right under Article 21A in India?', '42nd Amendment Act', '44th Amendment Act', '86th Amendment Act', '91st Amendment Act', 'C', 'The 86th Constitutional Amendment Act of 2002 inserted Article 21A, guaranteeing free and compulsory education to children aged 6 to 14.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- PYQ Test 1
        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'PYQ 2024 Exam Paper Test', 'ps-pyq-2024', 'Official CUET PG Political Science (HUQP18) 2024 Examination Paper.', 'pyq', 1, 105, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'Who founded the Bolshevik faction of the Russian Social Democratic Labour Party?', 'Vladimir Lenin', 'Leon Trotsky', 'Joseph Stalin', 'Nikita Khrushchev', 'A', 'Vladimir Lenin founded the Bolshevik faction in 1903 following the 2nd Congress of the RSDLP.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- Chapter 2
        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Indian Political Thought', 'Chapter 2: Indian Political Thought', 'indian-political-thought', 'Kautilya, Kabir, Gandhi, Ambedkar, Savarkar, Nehru, and Ram Manohar Lohia.', 2, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE
        RETURNING id INTO v_chap_id;

        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'Sectional Test 1: Ancient & Modern Indian Thought', 'ps-ch2-sec-1', 'Assess concepts from Saptanga theory to Swaraj and Annihilation of Caste.', 'sectional', 1, 45, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'According to Kautilya''s Arthashastra, which of the following is NOT one of the seven limbs (Saptanga) of the state?', 'Swami (The King)', 'Amatya (The Minister)', 'Dharma (The Religion)', 'Kosha (The Treasury)', 'C', 'The seven organs are Swami, Amatya, Janapada, Durga, Kosha, Danda, and Mitra. Dharma is not an organ in the Saptanga model.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- Chapter 3
        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Political Theory and Concepts', 'Chapter 3: Political Theory and Concepts', 'political-theory-concepts', 'Liberty, Equality, Justice, Rights, Democracy, Power, Citizenship, and the State.', 3, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE
        RETURNING id INTO v_chap_id;

        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'Sectional Test 1: Liberty, Rights and Justice', 'ps-ch3-sec-1', 'Key conceptual debates in political philosophy.', 'sectional', 1, 45, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'Who famously distinguished between "negative liberty" and "positive liberty" in the essay "Two Concepts of Liberty"?', 'John Rawls', 'Isaiah Berlin', 'Robert Nozick', 'Charles Taylor', 'B', 'Isaiah Berlin delivered his lecture "Two Concepts of Liberty" in 1958, clearly demarcating negative liberty from positive liberty.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- Chapter 4
        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'International Relations and Global Politics', 'Chapter 4: International Relations and Global Politics', 'international-relations', 'Theories of IR, Realism, Liberalism, Constructivism, UN system, and Global Governance.', 4, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE;

        -- Chapter 5
        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Indian Constitution and Politics', 'Chapter 5: Indian Constitution and Politics', 'indian-constitution-politics', 'Constituent Assembly, Fundamental Rights, Judiciary, Federalism, and Electoral Politics.', 5, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE;
    END LOOP;

    -- ==========================================
    -- 2. PHILOSOPHY (HUQP16)
    -- ==========================================
    FOR rec_subj IN SELECT id, slug FROM subjects WHERE slug = 'philosophy' LIMIT 1 LOOP
        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Classical Indian Philosophy', 'Chapter 1: Classical Indian Philosophy', 'classical-indian-philosophy', 'Nyaya, Vaisesika, Samkhya, Yoga, Mimamsa, and Vedanta traditions.', 1, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE
        RETURNING id INTO v_chap_id;

        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'Sectional Test 1: Orthodox Indian Systems', 'phil-ch1-sec-1', 'Epistemology and metaphysics of the Astika darshanas.', 'sectional', 1, 45, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'According to the Nyaya school of Indian philosophy, how many valid means of knowledge (Pramanas) are accepted?', 'Two', 'Three', 'Four', 'Six', 'C', 'Nyaya accepts four pramanas: Pratyaksha (perception), Anumana (inference), Upamana (comparison), and Shabda (testimony).', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- Full Length Test 1
        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'Full-Length Mock Test 1: Philosophy', 'phil-flt-1', 'Comprehensive mock paper for CUET PG Philosophy.', 'full_length', 1, 105, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'Which philosopher proclaimed "Cogito, ergo sum" (I think, therefore I am)?', 'Spinoza', 'Rene Descartes', 'Leibniz', 'John Locke', 'B', 'Rene Descartes established "Cogito, ergo sum" as the bedrock of certainty in his Discourse on Method and Meditations.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- PYQ Test 1
        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'PYQ 2024 Exam Paper: Philosophy', 'phil-pyq-2024', 'CUET PG Philosophy 2024 previous year question paper.', 'pyq', 1, 105, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'In Buddhist philosophy, the doctrine of Pratityasamutpada refers to:', 'Momentariness of all phenomena', 'Dependent Origination', 'Non-existence of self', 'Inviolability of Karma', 'B', 'Pratityasamutpada is the fundamental Buddhist doctrine of Dependent Origination or conditioned arising.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- Additional Chapters
        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Heterodox Indian Schools', 'Chapter 2: Heterodox Indian Schools', 'heterodox-schools', 'Buddhism, Jainism, and Carvaka epistemology and metaphysics.', 2, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE;

        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Western Philosophy and Logic', 'Chapter 3: Western Philosophy and Logic', 'western-phil-logic', 'Rationalism, Empiricism, Kantian critique, and Formal Logic.', 3, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE;
    END LOOP;

    -- ==========================================
    -- 3. PSYCHOLOGY (HUQP20)
    -- ==========================================
    FOR rec_subj IN SELECT id, slug FROM subjects WHERE slug = 'psychology' LIMIT 1 LOOP
        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Cognitive Processes and Memory', 'Chapter 1: Cognitive Processes and Memory', 'cognitive-processes-memory', 'Sensory mechanisms, attention, perception, learning theories, and memory models.', 1, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE
        RETURNING id INTO v_chap_id;

        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'Sectional Test 1: Cognitive Psychology', 'psych-ch1-sec-1', 'Classical conditioning, operant learning, and memory architectures.', 'sectional', 1, 45, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'Who formulated the multi-store model of memory consisting of Sensory Memory, Short-Term Memory, and Long-Term Memory?', 'Baddeley and Hitch', 'Atkinson and Shiffrin', 'Craik and Lockhart', 'Ebbinghaus', 'B', 'Richard Atkinson and Richard Shiffrin proposed the multi-store model of memory in 1968.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- Full Length Test 1
        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'Full-Length Mock Test 1: Psychology', 'psych-flt-1', 'Full syllabus mock test for CUET PG Psychology.', 'full_length', 1, 105, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'Which area of the human brain is primarily associated with speech production?', 'Wernicke''s area', 'Broca''s area', 'Occipital lobe', 'Hippocampus', 'B', 'Broca''s area, located in the frontal lobe of the dominant hemisphere, is responsible for speech production.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- PYQ Test 1
        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'PYQ 2024 Exam Paper: Psychology', 'psych-pyq-2024', 'CUET PG Psychology 2024 examination paper.', 'pyq', 1, 105, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'According to Erik Erikson, what is the central psychosocial crisis faced by adolescents?', 'Trust vs Mistrust', 'Industry vs Inferiority', 'Identity vs Role Confusion', 'Intimacy vs Isolation', 'C', 'During adolescence (ages 12-18), the central crisis is Identity vs Role Confusion.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Personality and Psychological Assessment', 'Chapter 2: Personality and Psychological Assessment', 'personality-assessment', 'Psychoanalytic, trait, humanistic theories, and psychological testing.', 2, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE;

        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Research Methodology and Statistics', 'Chapter 3: Research Methodology and Statistics', 'research-methodology-stats', 'Experimental design, hypothesis testing, correlation, and ANOVA.', 3, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE;
    END LOOP;

    -- ==========================================
    -- 4. HISTORY (HUQP09)
    -- ==========================================
    FOR rec_subj IN SELECT id, slug FROM subjects WHERE slug = 'history' LIMIT 1 LOOP
        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Ancient Indian History', 'Chapter 1: Ancient Indian History', 'ancient-indian-history', 'Indus Valley Civilisation, Vedic culture, Mahajanapadas, Mauryan Empire, and Gupta Age.', 1, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE
        RETURNING id INTO v_chap_id;

        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'Sectional Test 1: Ancient Polity & Archaeology', 'hist-ch1-sec-1', 'Archaeological and literary sources of early Indian state formation.', 'sectional', 1, 45, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'The famous Harappan site of Dholavira, known for its unique water management system, is situated in which Indian state?', 'Rajasthan', 'Gujarat', 'Haryana', 'Punjab', 'B', 'Dholavira is located on Khadir bet island in the Kutch Desert Wildlife Sanctuary in Gujarat.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- Full Length Test 1
        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'Full-Length Mock Test 1: History', 'hist-flt-1', 'Full syllabus mock paper for CUET PG History.', 'full_length', 1, 105, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'Who was the court poet of Harsha and the author of Harshacharita?', 'Banabhatta', 'Kalidasa', 'Harishena', 'Dandin', 'A', 'Banabhatta was the Asthana Kavi in the court of King Harsha and wrote Harshacharita and Kadambari.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- PYQ Test 1
        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'PYQ 2024 Exam Paper: History', 'hist-pyq-2024', 'CUET PG History 2024 original question paper.', 'pyq', 1, 105, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'The Permanent Settlement of Bengal was introduced in 1793 by which Governor-General?', 'Warren Hastings', 'Lord Cornwallis', 'Lord Wellesley', 'Lord Dalhousie', 'B', 'Lord Cornwallis enacted the Permanent Settlement of Bengal in 1793, establishing the Zamindari system.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Medieval Indian History', 'Chapter 2: Medieval Indian History', 'medieval-indian-history', 'Delhi Sultanate, Mughal Empire, Bhakti and Sufi movements, and Vijayanagara.', 2, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE;

        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Modern Indian History and National Movement', 'Chapter 3: Modern Indian History', 'modern-indian-history', 'Colonial economy, 1857 rebellion, Indian National Congress, and Freedom Struggle.', 3, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE;
    END LOOP;

    -- ==========================================
    -- 5. ECONOMICS (COQP10)
    -- ==========================================
    FOR rec_subj IN SELECT id, slug FROM subjects WHERE slug = 'economics' LIMIT 1 LOOP
        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Microeconomic Theory', 'Chapter 1: Microeconomic Theory', 'microeconomic-theory', 'Consumer theory, indifference curves, production functions, and market structures.', 1, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE
        RETURNING id INTO v_chap_id;

        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'Sectional Test 1: Consumer & Producer Equilibrium', 'econ-ch1-sec-1', 'Optimization, elasticity, cost curves, and perfect vs monopoly markets.', 'sectional', 1, 45, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'In consumer theory, an indifference curve is convex to the origin due to which economic principle?', 'Law of diminishing marginal utility', 'Diminishing marginal rate of substitution', 'Increasing returns to scale', 'Constant elasticity of substitution', 'B', 'The convexity of standard indifference curves is explained by the diminishing marginal rate of substitution (MRSxy).', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- Full Length Test 1
        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'Full-Length Mock Test 1: Economics', 'econ-flt-1', 'Complete CUET PG Economics mock test.', 'full_length', 1, 105, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'Which curve depicts the relationship between tax rates and total tax revenue collected by governments?', 'Lorenz Curve', 'Kuznets Curve', 'Laffer Curve', 'Phillips Curve', 'C', 'The Laffer Curve illustrates the relationship between tax rates and tax revenue.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- PYQ Test 1
        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'PYQ 2024 Exam Paper: Economics', 'econ-pyq-2024', 'CUET PG Economics 2024 actual question paper.', 'pyq', 1, 105, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'What is the monetary policy stance when the central bank lowers policy repo rates to stimulate liquidity?', 'Hawkish / Tight', 'Accommodative / Expansionary', 'Neutral', 'Contractionary', 'B', 'Lowering interest rates and infusing liquidity corresponds to an accommodative or expansionary monetary policy.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Macroeconomics and Monetary Economics', 'Chapter 2: Macroeconomics and Monetary Economics', 'macroeconomics-monetary', 'National income accounting, IS-LM model, inflation, and central banking.', 2, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE;

        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Indian Economy and Development', 'Chapter 3: Indian Economy and Development', 'indian-economy-dev', 'Growth trajectories, agricultural reforms, industrial policy, and poverty metrics.', 3, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE;
    END LOOP;

    -- ==========================================
    -- 6. GEOGRAPHY (HUQP08)
    -- ==========================================
    FOR rec_subj IN SELECT id, slug FROM subjects WHERE slug = 'geography' LIMIT 1 LOOP
        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Geomorphology and Earth Systems', 'Chapter 1: Geomorphology and Earth Systems', 'geomorphology-earth-systems', 'Plate tectonics, weathering, fluvial, aeolian, and glacial landforms.', 1, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE
        RETURNING id INTO v_chap_id;

        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'Sectional Test 1: Physical Geography', 'geog-ch1-sec-1', 'Endogenetic and exogenetic processes, continental drift, and landforms.', 'sectional', 1, 45, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'Which boundary separates the Earth''s crust from the mantle?', 'Mohorovicic discontinuity', 'Gutenberg discontinuity', 'Conrad discontinuity', 'Lehmann discontinuity', 'A', 'The Mohorovicic discontinuity (Moho) defines the boundary between the crust and the underlying mantle.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- Full Length Test 1
        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'Full-Length Mock Test 1: Geography', 'geog-flt-1', 'Full length comprehensive test for CUET PG Geography.', 'full_length', 1, 105, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'Which layer of the atmosphere contains the ozone layer that absorbs harmful solar ultraviolet radiation?', 'Troposphere', 'Stratosphere', 'Mesosphere', 'Thermosphere', 'B', 'The ozone layer is predominantly situated in the lower portion of the stratosphere from roughly 15 to 35 km.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- PYQ Test 1
        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'PYQ 2024 Exam Paper: Geography', 'geog-pyq-2024', 'CUET PG Geography 2024 previous year question paper.', 'pyq', 1, 105, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'Which Indian state has the longest coastline?', 'Tamil Nadu', 'Gujarat', 'Maharashtra', 'Andhra Pradesh', 'B', 'Gujarat has the longest mainland coastline in India, extending over 1,600 kilometers.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Climatology and Oceanography', 'Chapter 2: Climatology and Oceanography', 'climatology-oceanography', 'Atmospheric circulation, monsoons, ocean currents, and ocean floor topography.', 2, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE;

        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Geography of India', 'Chapter 3: Geography of India', 'geography-of-india', 'Physiographic divisions, drainage systems, natural resources, and demographics.', 3, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE;
    END LOOP;

    -- ==========================================
    -- 7. DISASTER MANAGEMENT (SCQP11)
    -- ==========================================
    FOR rec_subj IN SELECT id, slug FROM subjects WHERE slug = 'disaster-management' LIMIT 1 LOOP
        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Fundamentals of Disaster Risk & Hazards', 'Chapter 1: Fundamentals of Disaster Risk & Hazards', 'fundamentals-disaster-risk', 'Definitions of hazard, vulnerability, risk, capacity, and disaster typology.', 1, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE
        RETURNING id INTO v_chap_id;

        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'Sectional Test 1: Hazard Vulnerability Assessment', 'dm-ch1-sec-1', 'Core principles of risk identification, hazard zoning, and vulnerability matrices.', 'sectional', 1, 45, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'The Sendai Framework for Disaster Risk Reduction (2015-2030) was adopted at which UN World Conference?', 'First World Conference in Yokohama', 'Second World Conference in Kobe', 'Third World Conference in Sendai', 'Fourth World Conference in Geneva', 'C', 'The Sendai Framework was adopted at the Third UN World Conference on Disaster Risk Reduction in Sendai, Miyagi, Japan in March 2015.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- Full Length Test 1
        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'Full-Length Mock Test 1: Disaster Management', 'dm-flt-1', 'Comprehensive mock paper for CUET PG Disaster Management.', 'full_length', 1, 105, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'Who is the ex-officio Chairperson of the National Disaster Management Authority (NDMA) in India?', 'Union Minister of Home Affairs', 'Prime Minister of India', 'Cabinet Secretary', 'President of India', 'B', 'Under Section 3(2) of the Disaster Management Act 2005, the Prime Minister of India is the ex-officio Chairperson of NDMA.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        -- PYQ Test 1
        INSERT INTO tests (subject_id, chapter_id, title, slug, description, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
        VALUES (rec_subj.id, v_chap_id, 'PYQ 2024 Exam Paper: Disaster Management', 'dm-pyq-2024', 'CUET PG Disaster Management 2024 previous year paper.', 'pyq', 1, 105, 4.00, 1.00, 'published', TRUE, 'published', 1)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, publication_status = 'published', is_published = TRUE
        RETURNING id INTO v_test_id;

        INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks, created_by)
        VALUES (rec_subj.id, v_chap_id, 'Which magnitude scale measures the energy released by an earthquake on a logarithmic basis?', 'Mercalli Scale', 'Moment Magnitude / Richter Scale', 'Beaufort Scale', 'Saffir-Simpson Scale', 'B', 'The Richter scale and Moment Magnitude Scale (Mw) measure seismic energy released at the earthquake hypocenter.', 4.00, 1.00, v_admin_id)
        RETURNING id INTO v_q_id;

        INSERT INTO test_questions (test_id, question_id, display_order, question_order, question_number, positive_marks, negative_marks)
        VALUES (v_test_id, v_q_id, 1, 1, 1, 4.00, 1.00)
        ON CONFLICT (test_id, question_id) DO NOTHING;

        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Natural and Technological Disasters', 'Chapter 2: Natural and Technological Disasters', 'natural-tech-disasters', 'Seismic, hydrological, meteorological, and industrial hazard dynamics.', 2, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE;

        INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
        VALUES (rec_subj.id, 'Disaster Governance, NDMA and Policies', 'Chapter 3: Disaster Governance and Policies', 'disaster-governance-ndma', 'Disaster Management Act 2005, NDMA guidelines, SDRF/NDRF, and community resilience.', 3, 'published', TRUE)
        ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, publication_status = 'published', is_active = TRUE;
    END LOOP;

    RAISE NOTICE 'CUET PG Academic Hierarchy and Starter Test Series successfully initialized.';
END $$;
