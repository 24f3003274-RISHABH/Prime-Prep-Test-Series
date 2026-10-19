-- Migration: 013_sync_legacy_users_to_supabase_auth.sql
-- Description: Idempotently sync legacy users from public.users to auth.users, auth.identities, and public.profiles

DO $$
BEGIN
  -- 1. Ensure existing auth.users have the standard GoTrue instance_id and confirmed email
  UPDATE auth.users
  SET instance_id = '00000000-0000-0000-0000-000000000000'::uuid,
      aud = 'authenticated',
      role = 'authenticated',
      email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE instance_id IS NULL OR aud IS NULL OR role IS NULL;

  -- 2. Insert any missing users from public.users into auth.users
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  SELECT
    u.id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    LOWER(u.email),
    u.password_hash,
    COALESCE(u.created_at, NOW()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', u.full_name),
    u.created_at,
    u.updated_at
  FROM public.users u
  LEFT JOIN auth.users a ON a.id = u.id OR LOWER(a.email) = LOWER(u.email)
  WHERE a.id IS NULL
  ON CONFLICT (id) DO NOTHING;

  -- 3. Ensure identities exist for all auth.users (omitting generated email column)
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  )
  SELECT
    gen_random_uuid(),
    a.id,
    a.id::text,
    jsonb_build_object('sub', a.id::text, 'email', a.email),
    'email',
    NOW(),
    a.created_at,
    a.updated_at
  FROM auth.users a
  LEFT JOIN auth.identities i ON i.user_id = a.id AND i.provider = 'email'
  WHERE i.id IS NULL
  ON CONFLICT (provider_id, provider) DO NOTHING;

  -- 4. Ensure profiles exist for all auth.users
  INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
  SELECT
    a.id,
    COALESCE(a.raw_user_meta_data->>'full_name', u.full_name, 'PrimePrep Student'),
    COALESCE(u.role, 'student'),
    a.created_at,
    a.updated_at
  FROM auth.users a
  LEFT JOIN public.users u ON u.id = a.id
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role = CASE WHEN public.profiles.role = 'admin' THEN 'admin' ELSE EXCLUDED.role END;
END $$;
