-- Migration: 001_create_core_tables.sql
-- Description: Create core extensions, users, profiles, subjects, and test_categories tables.

-- Ensure UUID generation functions are available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: users (Application authentication identities)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_email UNIQUE (email)
);

-- If profiles exist from earlier prototypes or auth.users, backfill identities into public.users
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        INSERT INTO public.users (id, email, password_hash, role, created_at, updated_at)
        SELECT 
            au.id, 
            COALESCE(au.email, 'user_' || SUBSTRING(au.id::text FROM 1 FOR 8) || '@primeprep.local'),
            '$2b$10$placeholder_hash_needs_reset_during_bootstrap',
            COALESCE(p.role, 'student'),
            COALESCE(au.created_at, NOW()),
            NOW()
        FROM auth.users au
        LEFT JOIN public.profiles p ON p.id = au.id
        WHERE NOT EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = au.id OR u.email = au.email
        );
    END IF;
END $$;

-- Table: subjects (CUET PG academic disciplines)
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL,
    paper_code VARCHAR(50),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_subjects_slug UNIQUE (slug)
);

-- Ensure paper_code exists if subjects table already existed
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS paper_code VARCHAR(50);
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'code'
    ) THEN
        UPDATE subjects SET paper_code = code WHERE paper_code IS NULL AND code IS NOT NULL;
    END IF;
END $$;

-- Table: profiles (Extended user profiles)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    target_subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    phone_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if profiles table already existed
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'phone'
    ) THEN
        UPDATE profiles SET phone_number = phone WHERE phone_number IS NULL AND phone IS NOT NULL;
    END IF;
END $$;

-- Table: test_categories (Configurable test types e.g., Sectional, Full-Length, PYQ)
CREATE TABLE IF NOT EXISTS test_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    default_test_count INT NOT NULL DEFAULT 10 CHECK (default_test_count >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_test_categories_slug UNIQUE (slug)
);

ALTER TABLE test_categories ADD COLUMN IF NOT EXISTS default_test_count INT NOT NULL DEFAULT 10;
ALTER TABLE test_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_subjects_slug ON subjects(slug);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_target_subject ON profiles(target_subject_id);
CREATE INDEX IF NOT EXISTS idx_test_categories_slug ON test_categories(slug);
