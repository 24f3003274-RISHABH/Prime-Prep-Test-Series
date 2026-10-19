-- Migration: 012_profiles_auth_users_fk.sql
-- Description: Ensure profiles.id references auth.users(id) with ON DELETE CASCADE and RLS is enabled

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_profiles_auth_users'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT fk_profiles_auth_users
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
