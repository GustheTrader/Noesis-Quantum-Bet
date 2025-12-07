-- ================================================================
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
    FROM public.ingested_results
    WHERE source = NEW.source 
      AND (source_id = NEW.source_id OR (source_id IS NULL AND NEW.source_id IS NULL));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- Note: In practice, this is enforced by using the service role client on the server
CREATE POLICY "Service role can insert ingested_results"
    ON public.ingested_results
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Policy: Only service role can UPDATE
CREATE POLICY "Service role can update ingested_results"
    ON public.ingested_results
    FOR UPDATE
    USING (auth.role() = 'service_role');

-- Policy: Only service role can DELETE
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
