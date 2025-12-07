-- ================================================================
-- MIGRATION: Create Append-Only Ingested Results Table
-- Description: Creates an immutable, versioned storage for all ingested results
-- Date: 2025-12-07
-- ================================================================

-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- TABLE: ingested_results
-- Purpose: Store all ingested results with versioning and audit trail
-- ================================================================
CREATE TABLE IF NOT EXISTS ingested_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,                    -- 'weeks', 'picks', 'summaries', 'manual', 'api'
    source_id TEXT,                          -- original record id (optional, for tracking)
    content JSONB NOT NULL,                  -- full ingested result payload
    metadata JSONB,                          -- optional metadata (user id, ip, timestamps)
    version INT NOT NULL DEFAULT 1,          -- auto-incremented version number
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    replaced_by UUID,                        -- reference to newer version (optional)
    deleted BOOLEAN NOT NULL DEFAULT FALSE,  -- soft-delete flag
    
    -- Foreign key constraint for replaced_by
    CONSTRAINT fk_replaced_by FOREIGN KEY (replaced_by) 
        REFERENCES ingested_results(id) ON DELETE SET NULL
);

-- ================================================================
-- INDEXES: For efficient querying
-- ================================================================

-- Index for querying by source and source_id
CREATE INDEX IF NOT EXISTS idx_ingested_results_source_source_id 
    ON ingested_results(source, source_id);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_ingested_results_created_at 
    ON ingested_results(created_at DESC);

-- Index for querying active (non-deleted) records
CREATE INDEX IF NOT EXISTS idx_ingested_results_deleted 
    ON ingested_results(deleted) WHERE deleted = FALSE;

-- Unique index on (source, source_id, version) when source_id is provided
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingested_results_unique_version 
    ON ingested_results(source, source_id, version) 
    WHERE source_id IS NOT NULL;

-- Index for querying latest versions
CREATE INDEX IF NOT EXISTS idx_ingested_results_source_version 
    ON ingested_results(source, source_id, version DESC);

-- ================================================================
-- FUNCTION: Auto-increment version on insert
-- ================================================================
CREATE OR REPLACE FUNCTION auto_increment_version()
RETURNS TRIGGER AS $$
BEGIN
    -- If source_id is NULL, keep version as 1 (default)
    IF NEW.source_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- If version is not explicitly set (still at default 1), calculate it
    IF NEW.version = 1 THEN
        -- Find the max version for this source + source_id combination
        SELECT COALESCE(MAX(version), 0) + 1
        INTO NEW.version
        FROM ingested_results
        WHERE source = NEW.source 
          AND source_id = NEW.source_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- TRIGGER: Apply version auto-increment before insert
-- ================================================================
DROP TRIGGER IF EXISTS trg_auto_increment_version ON ingested_results;
CREATE TRIGGER trg_auto_increment_version
    BEFORE INSERT ON ingested_results
    FOR EACH ROW
    EXECUTE FUNCTION auto_increment_version();

-- ================================================================
-- FUNCTION: Get latest version of a record
-- ================================================================
CREATE OR REPLACE FUNCTION get_latest_ingested_result(
    p_source TEXT,
    p_source_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    source TEXT,
    source_id TEXT,
    content JSONB,
    metadata JSONB,
    version INT,
    created_at TIMESTAMPTZ,
    replaced_by UUID,
    deleted BOOLEAN
) AS $$
BEGIN
    IF p_source_id IS NULL THEN
        -- If no source_id, return the most recent record by created_at
        RETURN QUERY
        SELECT ir.id, ir.source, ir.source_id, ir.content, ir.metadata, 
               ir.version, ir.created_at, ir.replaced_by, ir.deleted
        FROM ingested_results ir
        WHERE ir.source = p_source
          AND ir.deleted = FALSE
        ORDER BY ir.created_at DESC
        LIMIT 1;
    ELSE
        -- If source_id provided, return highest version
        RETURN QUERY
        SELECT ir.id, ir.source, ir.source_id, ir.content, ir.metadata,
               ir.version, ir.created_at, ir.replaced_by, ir.deleted
        FROM ingested_results ir
        WHERE ir.source = p_source
          AND ir.source_id = p_source_id
          AND ir.deleted = FALSE
        ORDER BY ir.version DESC
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- FUNCTION: Get all versions of a record
-- ================================================================
CREATE OR REPLACE FUNCTION get_ingested_result_history(
    p_source TEXT,
    p_source_id TEXT
)
RETURNS TABLE (
    id UUID,
    source TEXT,
    source_id TEXT,
    content JSONB,
    metadata JSONB,
    version INT,
    created_at TIMESTAMPTZ,
    replaced_by UUID,
    deleted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT ir.id, ir.source, ir.source_id, ir.content, ir.metadata,
           ir.version, ir.created_at, ir.replaced_by, ir.deleted
    FROM ingested_results ir
    WHERE ir.source = p_source
      AND ir.source_id = p_source_id
    ORDER BY ir.version DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================
ALTER TABLE ingested_results ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to insert (for public ingestion)
DROP POLICY IF EXISTS "Public Insert Ingested Results" ON ingested_results;
CREATE POLICY "Public Insert Ingested Results" 
    ON ingested_results FOR INSERT 
    WITH CHECK (true);

-- Policy: Allow anonymous users to read non-deleted records
DROP POLICY IF EXISTS "Public Read Ingested Results" ON ingested_results;
CREATE POLICY "Public Read Ingested Results" 
    ON ingested_results FOR SELECT 
    USING (deleted = FALSE);

-- Policy: Only authenticated users can soft-delete
DROP POLICY IF EXISTS "Authenticated Soft Delete" ON ingested_results;
CREATE POLICY "Authenticated Soft Delete" 
    ON ingested_results FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only service_role can hard delete (typically disabled)
-- Note: This policy is commented out to prevent accidental hard deletes
-- DROP POLICY IF EXISTS "Service Role Hard Delete" ON ingested_results;
-- CREATE POLICY "Service Role Hard Delete" 
--     ON ingested_results FOR DELETE 
--     USING (auth.role() = 'service_role');

-- ================================================================
-- COMMENTS: Documentation
-- ================================================================
COMMENT ON TABLE ingested_results IS 
    'Append-only storage for all ingested results with versioning support';
COMMENT ON COLUMN ingested_results.source IS 
    'Type of ingested data: weeks, picks, summaries, manual, api';
COMMENT ON COLUMN ingested_results.source_id IS 
    'Original record ID for tracking and versioning (optional)';
COMMENT ON COLUMN ingested_results.content IS 
    'Full JSON payload of the ingested result';
COMMENT ON COLUMN ingested_results.version IS 
    'Auto-incremented version number for the same source+source_id';
COMMENT ON COLUMN ingested_results.replaced_by IS 
    'UUID of the newer version that supersedes this record';
COMMENT ON COLUMN ingested_results.deleted IS 
    'Soft-delete flag to hide records without removing them';

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================
-- Grant select, insert, update to anon role (for public ingestion)
GRANT SELECT, INSERT, UPDATE ON ingested_results TO anon;

-- Grant all privileges to authenticated users
GRANT ALL ON ingested_results TO authenticated;

-- Grant all privileges to service_role
GRANT ALL ON ingested_results TO service_role;

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================
-- This migration creates:
-- 1. ingested_results table with versioning
-- 2. Indexes for efficient queries
-- 3. Automatic version increment trigger
-- 4. Helper functions for querying latest/history
-- 5. RLS policies for secure access
-- ================================================================
