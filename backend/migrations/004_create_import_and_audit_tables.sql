-- Migration: 004_create_import_and_audit_tables.sql
-- Description: Create import_history and audit_logs tables with non-destructive referential integrity.

-- Table: import_history (Log of administrator Excel spreadsheet uploads and results)
CREATE TABLE IF NOT EXISTS import_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    subject_id UUID REFERENCES subjects(id) ON DELETE RESTRICT,
    test_series_id UUID REFERENCES test_series(id) ON DELETE SET NULL,
    test_id UUID REFERENCES tests(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    total_rows INT NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
    successful_rows INT NOT NULL DEFAULT 0 CHECK (successful_rows >= 0),
    failed_rows INT NOT NULL DEFAULT 0 CHECK (failed_rows >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'previewed', 'completed', 'failed')),
    error_summary JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure all import_history columns exist if pre-existed
ALTER TABLE import_history ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE import_history ADD COLUMN IF NOT EXISTS test_series_id UUID REFERENCES test_series(id) ON DELETE SET NULL;
ALTER TABLE import_history ADD COLUMN IF NOT EXISTS total_rows INT NOT NULL DEFAULT 0;
ALTER TABLE import_history ADD COLUMN IF NOT EXISTS successful_rows INT NOT NULL DEFAULT 0;
ALTER TABLE import_history ADD COLUMN IF NOT EXISTS failed_rows INT NOT NULL DEFAULT 0;
ALTER TABLE import_history ADD COLUMN IF NOT EXISTS error_summary JSONB;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'import_history' AND column_name = 'imported_by'
    ) THEN
        UPDATE import_history SET admin_id = imported_by WHERE admin_id IS NULL;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'import_history' AND column_name = 'successful_count'
    ) THEN
        UPDATE import_history SET successful_rows = successful_count WHERE successful_rows = 0;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'import_history' AND column_name = 'error_count'
    ) THEN
        UPDATE import_history SET failed_rows = error_count WHERE failed_rows = 0;
    END IF;
END $$;

-- Table: audit_logs (Immutable audit trail of sensitive administrative operations)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure details column exists if audit_logs pre-existed
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'metadata'
    ) THEN
        UPDATE audit_logs SET details = metadata WHERE details = '{}'::jsonb AND metadata IS NOT NULL;
    END IF;
END $$;

-- Import and Audit Indexes
CREATE INDEX IF NOT EXISTS idx_import_history_admin_id ON import_history(admin_id);
CREATE INDEX IF NOT EXISTS idx_import_history_subject_id ON import_history(subject_id);
CREATE INDEX IF NOT EXISTS idx_import_history_created_at ON import_history(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
