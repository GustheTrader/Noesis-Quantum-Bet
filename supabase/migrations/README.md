# Database Migrations

This directory contains SQL migrations for the Noesis Quantum Bet application.

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Log into your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the migration file contents
5. Click **Run** to execute

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link your project (first time only)
supabase link --project-ref your-project-ref

# Apply all pending migrations
supabase db push

# Or apply a specific migration
supabase db execute --file supabase/migrations/20251207_create_ingested_results.sql
```

### Option 3: Direct SQL Connection

Using `psql` or any PostgreSQL client:

```bash
psql postgresql://[user]:[password]@[host]:[port]/[database] < supabase/migrations/20251207_create_ingested_results.sql
```

## Available Migrations

### 20251207_create_ingested_results.sql

**Purpose**: Creates the append-only, versioned ingestion system

**What it does**:
- Creates `ingested_results` table with automatic versioning
- Sets up indexes for optimal query performance
- Adds helper functions for querying latest versions and history
- Configures Row Level Security (RLS) policies
- Enables soft-delete functionality

**Dependencies**: None (this is the first migration)

**Idempotency**: Safe to run multiple times (uses `IF NOT EXISTS` checks)

## Verifying Migrations

After running a migration, verify it worked:

```sql
-- Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ingested_results'
);

-- Check table structure
\d ingested_results

-- Test insert
INSERT INTO ingested_results (source, content)
VALUES ('manual', '{"test": true}');

-- Verify data
SELECT * FROM ingested_results;

-- Cleanup test data
DELETE FROM ingested_results WHERE content->>'test' = 'true';
```

## Migration History

| Date | File | Description |
|------|------|-------------|
| 2025-12-07 | 20251207_create_ingested_results.sql | Initial append-only ingestion system |

## Troubleshooting

### "relation already exists" Error

The migration is idempotent and should handle existing objects gracefully. If you see this error:

1. Check if the table already exists: `SELECT * FROM ingested_results LIMIT 1;`
2. If it exists and has the correct structure, the migration succeeded
3. If it exists but has incorrect structure, you may need to manually migrate data

### Permission Errors

Ensure you're running the migration with appropriate permissions:

```sql
-- Check current role
SELECT current_user, current_database();

-- Grant permissions if needed (run as superuser)
GRANT ALL ON ingested_results TO authenticated;
GRANT ALL ON ingested_results TO anon;
```

### Extension Not Found

If you see "extension 'pgcrypto' does not exist":

```sql
-- Enable the extension (run as superuser)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

## Rollback

To rollback the ingestion system migration:

⚠️ **Warning**: This will delete all data in the `ingested_results` table!

```sql
-- Drop the table and all dependent objects
DROP TABLE IF EXISTS ingested_results CASCADE;

-- Drop the functions
DROP FUNCTION IF EXISTS auto_increment_version() CASCADE;
DROP FUNCTION IF EXISTS get_latest_ingested_result(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_ingested_result_history(TEXT, TEXT) CASCADE;
```

## Best Practices

1. **Backup First**: Always backup your database before running migrations
2. **Test in Development**: Test migrations in a development environment first
3. **Read the Migration**: Review the SQL before running to understand what it does
4. **Check Dependencies**: Ensure any dependent tables/extensions exist
5. **Verify Results**: Always verify the migration succeeded as expected

## Support

For issues with migrations:

1. Review the migration SQL file comments
2. Check the main documentation: `docs/INGESTION.md`
3. Review test examples: `test/ingestion.test.ts`
4. Check Supabase logs for detailed error messages
