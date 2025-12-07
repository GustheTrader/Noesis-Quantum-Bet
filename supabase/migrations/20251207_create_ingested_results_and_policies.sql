-- ================================================================
-- MIGRATION: Create ingested_results table with append-only versioning
-- Date: 2025-12-07
-- Purpose: Admin-only ingestion flow with append-only results storage
-- ================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- 1. Create ingested_results table
-- ================================================================
CREATE TABLE IF NOT EXISTS ingested_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    replaced_by UUID REFERENCES ingested_results(id),
    deleted BOOLEAN NOT NULL DEFAULT false,
    
    -- Constraints
    CONSTRAINT ingested_results_version_positive CHECK (version > 0)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ingested_results_source_id ON ingested_results(source, source_id);
CREATE INDEX IF NOT EXISTS idx_ingested_results_created_at ON ingested_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingested_results_deleted ON ingested_results(deleted) WHERE deleted = false;

-- ================================================================
-- 2. Create function to auto-increment version
-- ================================================================
CREATE OR REPLACE FUNCTION auto_increment_ingested_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Get the max version for this source + source_id combination
    SELECT COALESCE(MAX(version), 0) + 1
    INTO NEW.version
    FROM ingested_results
    WHERE source = NEW.source AND source_id = NEW.source_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-increment version before insert
DROP TRIGGER IF EXISTS trigger_auto_increment_version ON ingested_results;
CREATE TRIGGER trigger_auto_increment_version
    BEFORE INSERT ON ingested_results
    FOR EACH ROW
    EXECUTE FUNCTION auto_increment_ingested_version();

-- ================================================================
-- 3. Enable Row Level Security (RLS)
-- ================================================================
ALTER TABLE ingested_results ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 4. Revoke public INSERT privileges
-- ================================================================
REVOKE INSERT ON ingested_results FROM anon;
REVOKE INSERT ON ingested_results FROM authenticated;

-- Allow public read access for SELECT (but not INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "Public can read non-deleted ingested results" ON ingested_results;
CREATE POLICY "Public can read non-deleted ingested results"
    ON ingested_results
    FOR SELECT
    USING (deleted = false);

-- Only service_role can INSERT (via server-side code)
-- Note: service_role bypasses RLS, so this is implicit
-- But we explicitly document the intent here

-- ================================================================
-- 5. Create optional admins table for DB-backed authentication
-- ================================================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Basic email format validation (not comprehensive, but sufficient for most cases)
    -- For production, consider additional application-level validation
    CONSTRAINT admins_email_valid CHECK (email ~* '^.+@.+\..+$')
);

-- Enable RLS on admins table
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Revoke all public access to admins table
REVOKE ALL ON admins FROM anon;
REVOKE ALL ON admins FROM authenticated;

-- Only service_role can access admins table
-- This ensures password hashes are never exposed to client

-- Create index for efficient email lookup
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- ================================================================
-- NOTES FOR USAGE:
-- ================================================================
-- 1. To insert ingested results, use server-side code with SUPABASE_SERVICE_ROLE_KEY
-- 2. Example insert:
--    INSERT INTO ingested_results (source, source_id, content, metadata)
--    VALUES ('pdf_upload', 'week-5-report', '{"data": "..."}', '{"files": ["url1"]}');
-- 3. To create an admin user with hashed password:
--    INSERT INTO admins (email, password_hash)
--    VALUES ('admin@example.com', crypt('password', gen_salt('bf')));
-- 4. Version will auto-increment for duplicate (source, source_id) pairs
-- ================================================================
