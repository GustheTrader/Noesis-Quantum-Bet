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
-- Migration: Create ingested_results table with append-only design
-- Date: 2025-12-07
-- Description: Admin-only ingestion flow with versioned, append-only storage
-- ================================================================

-- Enable pgcrypto extension for UUID generation (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create ingested_results table (idempotent)
CREATE TABLE IF NOT EXISTS public.ingested_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source text NOT NULL,
    source_id text,
    content jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    replaced_by uuid,
    deleted boolean NOT NULL DEFAULT false,
    CONSTRAINT fk_replaced_by FOREIGN KEY (replaced_by) 
        REFERENCES public.ingested_results(id) ON DELETE SET NULL
);

-- Create indexes for performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_ingested_results_source_source_id 
    ON public.ingested_results(source, source_id);

CREATE INDEX IF NOT EXISTS idx_ingested_results_created_at 
    ON public.ingested_results(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingested_results_deleted 
    ON public.ingested_results(deleted) WHERE deleted = false;

-- Create unique index for versioning (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingested_results_source_version 
    ON public.ingested_results(source, source_id, version);

-- ================================================================
-- Auto-increment version trigger function
-- ================================================================

-- Drop and recreate the function to ensure it's up to date
DROP FUNCTION IF EXISTS public.auto_increment_version() CASCADE;

CREATE OR REPLACE FUNCTION public.auto_increment_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Get the max version for this source + source_id combination
    SELECT COALESCE(MAX(version), 0) + 1
    INTO NEW.version
    FROM ingested_results
    WHERE source = NEW.source AND source_id = NEW.source_id;
    FROM public.ingested_results
    WHERE source = NEW.source 
      AND (source_id = NEW.source_id OR (source_id IS NULL AND NEW.source_id IS NULL));
    
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
-- Drop existing trigger if exists, then create new one
DROP TRIGGER IF EXISTS trigger_auto_increment_version ON public.ingested_results;

CREATE TRIGGER trigger_auto_increment_version
    BEFORE INSERT ON public.ingested_results
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_increment_version();

-- ================================================================
-- Row Level Security (RLS) Setup
-- ================================================================

-- Enable RLS on the table
ALTER TABLE public.ingested_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Public can read ingested_results" ON public.ingested_results;
DROP POLICY IF EXISTS "Service role can insert ingested_results" ON public.ingested_results;
DROP POLICY IF EXISTS "Service role can update ingested_results" ON public.ingested_results;
DROP POLICY IF EXISTS "Service role can delete ingested_results" ON public.ingested_results;

-- Policy: Allow public SELECT (read) access
CREATE POLICY "Public can read ingested_results"
    ON public.ingested_results
    FOR SELECT
    USING (true);

-- Policy: Only service role can INSERT
-- NOTE: Service role operations bypass RLS, so this policy is mainly declarative.
-- The real enforcement comes from:
-- 1. Only the server has the service role key
-- 2. The REVOKE statements below remove public INSERT permissions
-- 3. Client applications use the anon key which cannot insert
CREATE POLICY "Service role can insert ingested_results"
    ON public.ingested_results
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Policy: Only service role can UPDATE
-- NOTE: Service role operations bypass RLS (see note above)
CREATE POLICY "Service role can update ingested_results"
    ON public.ingested_results
    FOR UPDATE
    USING (auth.role() = 'service_role');

-- Policy: Only service role can DELETE
-- NOTE: Service role operations bypass RLS (see note above)
CREATE POLICY "Service role can delete ingested_results"
    ON public.ingested_results
    FOR DELETE
    USING (auth.role() = 'service_role');

-- ================================================================
-- Revoke public write permissions (belt and suspenders approach)
-- ================================================================

-- Revoke INSERT, UPDATE, DELETE from public and anon roles
REVOKE INSERT, UPDATE, DELETE ON public.ingested_results FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.ingested_results FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.ingested_results FROM authenticated;

-- Grant only SELECT to public
GRANT SELECT ON public.ingested_results TO PUBLIC;
GRANT SELECT ON public.ingested_results TO anon;
GRANT SELECT ON public.ingested_results TO authenticated;

-- ================================================================
-- Verification Comments
-- ================================================================

COMMENT ON TABLE public.ingested_results IS 
    'Append-only storage for ingested results with versioning. Only service role can write.';

COMMENT ON COLUMN public.ingested_results.version IS 
    'Auto-incremented per (source, source_id) combination';

COMMENT ON COLUMN public.ingested_results.replaced_by IS 
    'UUID of the record that replaces this one, if any';

COMMENT ON COLUMN public.ingested_results.deleted IS 
    'Soft delete flag - records are never physically deleted';
