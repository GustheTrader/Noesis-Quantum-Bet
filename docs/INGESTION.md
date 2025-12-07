# Ingestion System Documentation

## Overview

The Noesis Quantum Bet application uses an **append-only, versioned ingestion system** to permanently store all ingested results. This ensures that historical data is never lost when new features are added or existing records are updated.

## Architecture

### Append-Only Storage Model

Instead of using destructive `UPSERT` operations that overwrite existing records, the system:

1. **Creates new versioned records** for every ingestion
2. **Preserves complete history** of all data changes
3. **Enables auditing** and time-travel queries
4. **Prevents data loss** during updates and migrations

### Database Schema

#### `ingested_results` Table

The core table for storing all ingested data:

```sql
CREATE TABLE ingested_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,                    -- 'weeks', 'picks', 'summaries', 'manual', 'api'
    source_id TEXT,                          -- original record id (for tracking)
    content JSONB NOT NULL,                  -- full ingested result payload
    metadata JSONB,                          -- optional metadata
    version INT NOT NULL DEFAULT 1,          -- auto-incremented version
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    replaced_by UUID,                        -- reference to newer version
    deleted BOOLEAN NOT NULL DEFAULT FALSE   -- soft-delete flag
);
```

#### Key Features

- **Automatic Versioning**: Version numbers auto-increment for the same `source` + `source_id` combination
- **Soft Deletes**: Records are marked as deleted rather than physically removed
- **JSONB Content**: Flexible storage for any data structure
- **Metadata**: Track additional context (user, IP, timestamps, etc.)
- **Indexes**: Optimized for querying by source, source_id, version, and created_at

## Usage

### TypeScript API

Import the ingestion functions:

```typescript
import {
  insertIngestedResult,
  getLatestIngestedResult,
  getAllLatestIngestedResults,
  getIngestedResultHistory,
  extractContent,
  extractContents
} from './lib/ingestion-db';
```

### Insert New Data (Append-Only)

```typescript
// Insert a new week result
const { data, error } = await insertIngestedResult(
  'weeks',           // source type
  weekData,          // full data object
  weekData.id,       // source_id for versioning (optional)
  {                  // metadata (optional)
    uploaded_at: new Date().toISOString(),
    user_agent: navigator.userAgent
  }
);

if (error) {
  console.error('Failed to save:', error);
}
```

### Query Latest Version

```typescript
// Get the latest version of a specific record
const { data, error } = await getLatestIngestedResult('weeks', 'week-123');
const weekData = extractContent(data);

// Get all latest versions for a source
const { data: allWeeks, error } = await getAllLatestIngestedResults('weeks');
const weeksList = extractContents(allWeeks);
```

### Query History

```typescript
// Get all versions of a record
const { data: history, error } = await getIngestedResultHistory('weeks', 'week-123');

// Process historical versions
history.forEach(record => {
  console.log(`Version ${record.version} created at ${record.created_at}`);
  console.log('Content:', record.content);
});
```

### Soft Delete

```typescript
import { softDeleteIngestedResult } from './lib/ingestion-db';

// Mark a record as deleted (preserves in database)
const { error } = await softDeleteIngestedResult(recordId);
```

## Data Sources

The system tracks ingestion from multiple sources:

- **`weeks`**: Weekly betting performance reports
- **`picks`**: Betting picks and predictions
- **`summaries`**: Game summaries and analysis
- **`manual`**: Manually uploaded data via UI
- **`api`**: Data ingested through API endpoints

## Migration from Legacy System

### Backward Compatibility

The application maintains backward compatibility by:

1. **Reading from both systems**: Tries new `ingested_results` table first, falls back to old tables
2. **Dual writes**: Writes to both new and old tables during transition period
3. **Gradual migration**: Old data can be migrated incrementally

### Migration Helper

```typescript
import { migrateExistingData } from './lib/ingestion-db';

// Migrate existing weeks data
const { success, failed, errors } = await migrateExistingData('weeks', existingWeeks);
console.log(`Migrated ${success} records, ${failed} failed`);
```

## SQL Helper Functions

The migration includes helper functions you can use directly in SQL:

### Get Latest Version

```sql
-- Get latest version of a specific record
SELECT * FROM get_latest_ingested_result('weeks', 'week-123');

-- Get latest record by source (when source_id is null)
SELECT * FROM get_latest_ingested_result('weeks', NULL);
```

### Get History

```sql
-- Get all versions of a record
SELECT * FROM get_ingested_result_history('weeks', 'week-123');
```

### Query Examples

```sql
-- Get all non-deleted weeks
SELECT * FROM ingested_results
WHERE source = 'weeks' AND deleted = FALSE
ORDER BY created_at DESC;

-- Get latest versions only
SELECT DISTINCT ON (source_id) *
FROM ingested_results
WHERE source = 'weeks' AND deleted = FALSE
ORDER BY source_id, version DESC;

-- Count versions per record
SELECT source_id, COUNT(*) as version_count
FROM ingested_results
WHERE source = 'weeks'
GROUP BY source_id;

-- Get records created in the last 7 days
SELECT * FROM ingested_results
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

## Security & Permissions

### Row Level Security (RLS)

The table uses RLS policies:

- **Anonymous users**: Can INSERT and SELECT non-deleted records
- **Authenticated users**: Can also soft-delete (UPDATE)
- **Service role**: Full access (including hard deletes)

### Best Practices

1. **Never hard delete**: Use soft deletes to preserve history
2. **Include metadata**: Add context about who/what/when for audit trails
3. **Use source_id**: Enables proper versioning and history tracking
4. **Query latest only**: Use helper functions to get current state
5. **Archive old versions**: Set up retention policies for long-term storage

## Retention Policies (Optional)

You can implement retention policies to archive or compress old versions:

```sql
-- Example: Archive versions older than 1 year
UPDATE ingested_results
SET metadata = jsonb_set(metadata, '{archived}', 'true')
WHERE created_at < NOW() - INTERVAL '1 year'
  AND version < (
    SELECT MAX(version) FROM ingested_results ir2
    WHERE ir2.source = ingested_results.source
      AND ir2.source_id = ingested_results.source_id
  );
```

## Troubleshooting

### Table Not Found

If you get a "table not found" error:

1. Run the migration: `supabase/migrations/20251207_create_ingested_results.sql`
2. Execute in Supabase SQL Editor
3. Verify with: `SELECT * FROM ingested_results LIMIT 1;`

### Version Conflicts

The unique index prevents duplicate versions:

```
ERROR: duplicate key value violates unique constraint "idx_ingested_results_unique_version"
```

This is expected behavior - versions are auto-incremented by the trigger.

### Permission Errors

Ensure RLS policies are set up correctly:

```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'ingested_results';
```

## Performance Considerations

### Indexes

The system includes optimized indexes for:

- `(source, source_id)` - Fast lookup by source
- `created_at DESC` - Time-based queries
- `(source, source_id, version)` - Unique version constraint
- `deleted` - Filter non-deleted records

### Query Optimization

For best performance:

1. Always include `deleted = FALSE` in WHERE clauses
2. Use `LIMIT` for large result sets
3. Index on custom metadata fields if queried frequently
4. Consider materialized views for complex aggregations

## Support

For issues or questions about the ingestion system:

1. Check this documentation
2. Review the migration file: `supabase/migrations/20251207_create_ingested_results.sql`
3. Examine the TypeScript module: `lib/ingestion-db.ts`
4. Test with: `test/ingestion.test.ts`
