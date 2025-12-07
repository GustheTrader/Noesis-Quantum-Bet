# Migration Guide: Append-Only Ingestion System

This guide will help you migrate to the new append-only ingestion system.

## Quick Start

### Step 1: Run the Database Migration

**Option A: Supabase Dashboard** (Recommended for most users)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **+ New Query**
4. Copy the entire contents of `supabase/migrations/20251207_create_ingested_results.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Wait for "Success. No rows returned" message

**Option B: Supabase CLI** (For developers)

```bash
# If not already initialized
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push
```

### Step 2: Verify the Migration

Run this query in Supabase SQL Editor:

```sql
-- Check if table exists
SELECT * FROM ingested_results LIMIT 1;

-- Check helper functions
SELECT * FROM get_latest_ingested_result('weeks', NULL);

-- Verify indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'ingested_results';
```

If all queries run without errors, the migration was successful!

### Step 3: Deploy Updated Application

The application code has been updated to use the new ingestion system automatically.

```bash
# Pull latest changes
git pull origin main

# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Deploy to your hosting platform
```

## Understanding the Changes

### What Changed?

**Before (Destructive Upserts)**:
```typescript
// Old: Overwrites existing data
await supabase.from('weeks').upsert(newWeekData);
```

**After (Append-Only Inserts)**:
```typescript
// New: Preserves all versions
await insertIngestedResult('weeks', newWeekData, newWeekData.id);
```

### Backward Compatibility

The application maintains **full backward compatibility**:

1. **Reads**: Tries new table first, falls back to old tables if not found
2. **Writes**: Writes to both new and old tables during transition
3. **Queries**: Uses helper functions to get latest versions automatically

### Migration Timeline

#### Phase 1: Dual-Write (Current)
- New data goes to both `ingested_results` and legacy tables
- Reads prefer `ingested_results`, fall back to legacy
- **No data loss risk**
- **Zero downtime**

#### Phase 2: Migration (Optional)
- Migrate existing data from legacy tables
- Use provided migration helper function
- Verify all data in new system

#### Phase 3: Legacy Deprecation (Future)
- Remove dual-write after confidence period
- Keep legacy tables for historical reference
- Update queries to only use new system

## Migrating Existing Data (Optional)

If you want to migrate historical data from old tables:

### Method 1: Using TypeScript Helper

```typescript
import { migrateExistingData } from './lib/ingestion-db';
import { supabase } from './lib/supabase';

async function migrateHistoricalData() {
  // Fetch all existing weeks
  const { data: weeks } = await supabase
    .from('weeks')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (weeks) {
    const result = await migrateExistingData('weeks', weeks);
    console.log(`Migrated ${result.success} weeks, ${result.failed} failed`);
  }
  
  // Repeat for picks and summaries
  const { data: picks } = await supabase.from('picks').select('*');
  if (picks) {
    const result = await migrateExistingData('picks', picks);
    console.log(`Migrated ${result.success} picks, ${result.failed} failed`);
  }
  
  const { data: summaries } = await supabase.from('summaries').select('*');
  if (summaries) {
    const result = await migrateExistingData('summaries', summaries);
    console.log(`Migrated ${result.success} summaries, ${result.failed} failed`);
  }
}

// Run migration
migrateHistoricalData();
```

### Method 2: Direct SQL

```sql
-- Migrate weeks
INSERT INTO ingested_results (source, source_id, content, metadata, created_at)
SELECT 
  'weeks' as source,
  id as source_id,
  row_to_json(weeks.*) as content,
  jsonb_build_object(
    'migrated', true,
    'migration_date', now(),
    'original_table', 'weeks'
  ) as metadata,
  created_at
FROM weeks
ORDER BY created_at;

-- Migrate picks
INSERT INTO ingested_results (source, source_id, content, metadata, created_at)
SELECT 
  'picks' as source,
  id as source_id,
  row_to_json(picks.*) as content,
  jsonb_build_object(
    'migrated', true,
    'migration_date', now(),
    'original_table', 'picks'
  ) as metadata,
  created_at
FROM picks
ORDER BY created_at;

-- Migrate summaries
INSERT INTO ingested_results (source, source_id, content, metadata, created_at)
SELECT 
  'summaries' as source,
  id as source_id,
  row_to_json(summaries.*) as content,
  jsonb_build_object(
    'migrated', true,
    'migration_date', now(),
    'original_table', 'summaries'
  ) as metadata,
  created_at
FROM summaries
ORDER BY created_at;
```

### Verify Migration

```sql
-- Count records by source
SELECT source, COUNT(*) as count
FROM ingested_results
GROUP BY source;

-- Compare with old tables
SELECT 
  (SELECT COUNT(*) FROM weeks) as old_weeks,
  (SELECT COUNT(*) FROM ingested_results WHERE source = 'weeks') as new_weeks,
  (SELECT COUNT(*) FROM picks) as old_picks,
  (SELECT COUNT(*) FROM ingested_results WHERE source = 'picks') as new_picks,
  (SELECT COUNT(*) FROM summaries) as old_summaries,
  (SELECT COUNT(*) FROM ingested_results WHERE source = 'summaries') as new_summaries;
```

## Testing the New System

### Test 1: Verify Append-Only Behavior

```typescript
import { insertIngestedResult, getIngestedResultHistory } from './lib/ingestion-db';

// Insert same record twice
const data = { id: 'test-1', title: 'Test', value: 100 };
await insertIngestedResult('weeks', data, 'test-1');
await insertIngestedResult('weeks', { ...data, value: 200 }, 'test-1');

// Check history
const { data: history } = await getIngestedResultHistory('weeks', 'test-1');
console.log('Versions:', history?.length); // Should be 2
console.log('Version 1:', history?.[1].content.value); // Should be 100
console.log('Version 2:', history?.[0].content.value); // Should be 200
```

### Test 2: Verify Latest Version Retrieval

```typescript
import { getLatestIngestedResult, extractContent } from './lib/ingestion-db';

const { data: latest } = await getLatestIngestedResult('weeks', 'test-1');
const content = extractContent(latest);
console.log('Latest value:', content?.value); // Should be 200
```

### Test 3: Verify Soft Delete

```typescript
import { softDeleteIngestedResult, getLatestIngestedResult } from './lib/ingestion-db';

// Insert a record
const result = await insertIngestedResult('weeks', data, 'test-2');
const recordId = result.data?.id;

// Soft delete it
await softDeleteIngestedResult(recordId!);

// Verify it's not returned
const { data: deleted } = await getLatestIngestedResult('weeks', 'test-2');
console.log('Deleted record:', deleted); // Should be null
```

## Troubleshooting

### Issue: "relation 'ingested_results' does not exist"

**Solution**: The migration hasn't been run yet.
1. Follow Step 1 above to run the migration
2. Verify with `SELECT * FROM ingested_results LIMIT 1;`

### Issue: "permission denied for table ingested_results"

**Solution**: RLS policies may not be set up correctly.

```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'ingested_results';

-- If missing, re-run the migration
-- Or manually grant permissions
GRANT ALL ON ingested_results TO anon;
GRANT ALL ON ingested_results TO authenticated;
```

### Issue: Data not appearing in application

**Solution**: Check if old tables still have data.

```sql
-- Check both systems
SELECT 'OLD weeks' as source, COUNT(*) FROM weeks
UNION ALL
SELECT 'NEW weeks' as source, COUNT(*) FROM ingested_results WHERE source = 'weeks';
```

If old tables have data but new table is empty, the fallback is working. Consider migrating data.

### Issue: Duplicate version numbers

**Solution**: This shouldn't happen with the trigger, but if it does:

```sql
-- Check for duplicates
SELECT source, source_id, version, COUNT(*)
FROM ingested_results
WHERE source_id IS NOT NULL
GROUP BY source, source_id, version
HAVING COUNT(*) > 1;

-- Fix if needed (assigns new versions)
UPDATE ingested_results
SET version = subq.new_version
FROM (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY source, source_id ORDER BY created_at) as new_version
  FROM ingested_results
) subq
WHERE ingested_results.id = subq.id;
```

## Rollback Plan

If you need to rollback to the old system:

### Temporary Rollback (Keep New Table)

Just revert the application code changes. The app will fall back to old tables automatically.

```bash
git revert <commit-hash>
npm run build
```

### Full Rollback (Remove New Table)

⚠️ **Warning**: This deletes all data in `ingested_results`!

```sql
-- Drop the table
DROP TABLE IF EXISTS ingested_results CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS auto_increment_version() CASCADE;
DROP FUNCTION IF EXISTS get_latest_ingested_result(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_ingested_result_history(TEXT, TEXT) CASCADE;
```

Then revert the application code.

## Support

- **Documentation**: See `docs/INGESTION.md` for detailed API docs
- **Tests**: See `test/ingestion.test.ts` for usage examples
- **Migration SQL**: See `supabase/migrations/20251207_create_ingested_results.sql`

## Success Criteria

✅ Migration is successful when:

1. `SELECT * FROM ingested_results;` returns data (or empty table is okay)
2. New records create versioned entries
3. Application reads and displays data correctly
4. No errors in browser console or Supabase logs
5. Historical data (if migrated) matches old tables

## Next Steps

After successful migration:

1. **Monitor**: Watch Supabase logs for any errors
2. **Test**: Verify all ingestion flows work (manual upload, API, etc.)
3. **Document**: Update team docs with new patterns
4. **Train**: Ensure team understands append-only model
5. **Plan**: Schedule legacy table deprecation (optional, future)

Need help? Review the detailed documentation in `docs/INGESTION.md`.
