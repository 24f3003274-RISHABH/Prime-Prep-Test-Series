-- Migration: 017_create_subject_packages_and_entitlements.sql
-- Description: Subject-Wise Test Series Pricing, Razorpay Orders, Subject Entitlements, and Global Free Tests Designation

-- 1. Subject Packages table
CREATE TABLE IF NOT EXISTS subject_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    price_paise INTEGER NOT NULL DEFAULT 49900 CHECK (price_paise >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    features JSONB NOT NULL DEFAULT '["All Sectional Tests", "All Full-Length Mock Tests", "All Previous Year Question (PYQ) Tests", "Detailed Performance Analytics & Rank", "Full Answer Explanations"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_subject_packages_subject_id UNIQUE (subject_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_packages_subject_id ON subject_packages(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_packages_is_active ON subject_packages(is_active);

-- Seed subject packages for all existing subjects at ₹499 (49900 paise)
INSERT INTO subject_packages (subject_id, price_paise, currency, is_active)
SELECT id, 49900, 'INR', TRUE
FROM subjects
ON CONFLICT (subject_id) DO NOTHING;

-- 2. Payment Orders table (Razorpay orders & records)
CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    package_id UUID REFERENCES subject_packages(id) ON DELETE SET NULL,
    amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'attempted', 'paid', 'failed')),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON payment_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_subject_id ON payment_orders(subject_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);

-- 3. Subject Entitlements table (Subject-level access control)
CREATE TABLE IF NOT EXISTS subject_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    order_id UUID REFERENCES payment_orders(id) ON DELETE SET NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_subject_active_entitlement UNIQUE (user_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_entitlements_user_subject ON subject_entitlements(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_entitlements_status ON subject_entitlements(status);

-- 4. Global Free Tests Designation table (Exactly 1 Sectional and 1 PYQ test free globally)
CREATE TABLE IF NOT EXISTS global_free_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_type VARCHAR(50) UNIQUE NOT NULL CHECK (test_type IN ('sectional', 'pyq')),
    test_id UUID REFERENCES tests(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Seed initial global free test assignments from available published tests
INSERT INTO global_free_tests (test_type, test_id)
SELECT 'sectional', id
FROM tests
WHERE test_type = 'sectional' AND (publication_status = 'published' OR is_published = TRUE)
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (test_type) DO NOTHING;

INSERT INTO global_free_tests (test_type, test_id)
SELECT 'pyq', id
FROM tests
WHERE test_type = 'pyq' AND (publication_status = 'published' OR is_published = TRUE)
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (test_type) DO NOTHING;
