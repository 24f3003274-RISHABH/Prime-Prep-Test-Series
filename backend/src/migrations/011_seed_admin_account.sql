-- Migration: 011_seed_admin_account.sql
-- Description: Provision and configure administrator account for rishabhmyp@gmail.com
-- Password: Admin@8218 (hashed using bcrypt)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
    v_admin_email VARCHAR := 'rishabhmyp@gmail.com';
    v_admin_name VARCHAR := 'Rishabh Keshari';
    -- bcrypt hash of 'Admin@8218' generated via bcrypt(10 rounds)
    v_password_hash VARCHAR := '$2b$10$1Q8Imih4OG/GuyBcBsqBo.jDXYW9Qcg8LN1FxlMvlXaNjLd8.lEsC';
    v_user_id UUID;
BEGIN
    -- 1. Ensure user exists in public.users with admin role
    SELECT id INTO v_user_id FROM public.users WHERE LOWER(email) = LOWER(v_admin_email) LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        UPDATE public.users
        SET full_name = v_admin_name,
            password_hash = v_password_hash,
            role = 'admin',
            is_active = TRUE,
            updated_at = NOW()
        WHERE id = v_user_id;
    ELSE
        INSERT INTO public.users (full_name, email, password_hash, role, is_active)
        VALUES (v_admin_name, LOWER(v_admin_email), v_password_hash, 'admin', TRUE)
        RETURNING id INTO v_user_id;
    END IF;

    -- 2. Ensure user exists in auth.users (Supabase Auth) with confirmed email
    IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(v_admin_email)) THEN
        UPDATE auth.users
        SET encrypted_password = v_password_hash,
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            raw_user_meta_data = jsonb_build_object('full_name', v_admin_name),
            updated_at = NOW()
        WHERE LOWER(email) = LOWER(v_admin_email);
    ELSE
        INSERT INTO auth.users (
            id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        )
        VALUES (
            v_user_id, 'authenticated', 'authenticated', LOWER(v_admin_email), v_password_hash, NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', v_admin_name),
            NOW(), NOW()
        );
    END IF;

    -- 3. Ensure corresponding profile in public.profiles exists with admin role
    INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
    VALUES (v_user_id, v_admin_name, 'admin', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role = 'admin',
        updated_at = NOW();

    -- 4. Record admin audit log
    INSERT INTO public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, details)
    VALUES (
        v_user_id,
        'ADMIN_ACCOUNT_PROVISIONED',
        'users',
        v_user_id,
        jsonb_build_object('email', v_admin_email, 'role', 'admin', 'source', 'migration_011')
    );
END $$;
