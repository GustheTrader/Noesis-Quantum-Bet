# Ingestion System Architecture

## Overview

This document provides a visual overview of the append-only ingestion system architecture.

## System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       User Actions                               │
│  (Manual Upload, API Call, Admin Panel, Automated Ingestion)    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
│                                                                   │
│  App.tsx / Admin.tsx / API Endpoints                            │
│  ┌──────────────────────────────────────────────────┐           │
│  │  Handlers:                                        │           │
│  │  - handleDataUpload()                            │           │
│  │  - handlePicksUpdate()                           │           │
│  │  - handleGameSummaryUpload()                     │           │
│  └──────────────────┬───────────────────────────────┘           │
│                     │                                             │
│                     │ calls                                       │
│                     ▼                                             │
│  ┌──────────────────────────────────────────────────┐           │
│  │  lib/ingestion-db.ts                             │           │
│  │  - insertIngestedResult()                        │           │
│  │  - getLatestIngestedResult()                     │           │
│  │  - getAllLatestIngestedResults()                 │           │
│  │  - getIngestedResultHistory()                    │           │
│  └──────────────────┬───────────────────────────────┘           │
└────────────────────┬┴───────────────────────────────────────────┘
                     │
                     │ uses @supabase/supabase-js
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Database                             │
│                                                                   │
│  ┌─────────────────────────────────────────────────┐            │
│  │  ingested_results Table                          │            │
│  │  ┌───────────────────────────────────┐          │            │
│  │  │ id: UUID                           │          │            │
│  │  │ source: TEXT (weeks/picks/etc.)   │          │            │
│  │  │ source_id: TEXT (optional)        │          │            │
│  │  │ content: JSONB                    │          │            │
│  │  │ metadata: JSONB                   │          │            │
│  │  │ version: INT (auto-increment)     │          │            │
│  │  │ created_at: TIMESTAMPTZ           │          │            │
│  │  │ replaced_by: UUID                 │          │            │
│  │  │ deleted: BOOLEAN                  │          │            │
│  │  └───────────────────────────────────┘          │            │
│  │                                                   │            │
│  │  Triggers:                                       │            │
│  │  - auto_increment_version()                     │            │
│  │                                                   │            │
│  │  Functions:                                      │            │
│  │  - get_latest_ingested_result()                 │            │
│  │  - get_ingested_result_history()                │            │
│  │                                                   │            │
│  │  Indexes:                                        │            │
│  │  - idx_ingested_results_source_source_id        │            │
│  │  - idx_ingested_results_created_at              │            │
│  │  - idx_ingested_results_deleted                 │            │
│  │  - idx_ingested_results_unique_version          │            │
│  │  - idx_ingested_results_source_version          │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                   │
│  Legacy Tables (Backward Compatibility):                         │
│  ┌─────────────────────────────────────────────────┐            │
│  │ - weeks (old)                                    │            │
│  │ - picks (old)                                    │            │
│  │ - summaries (old)                                │            │
│  └─────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### Insert Flow (Append-Only)

```
New Data → insertIngestedResult()
              │
              ├─→ Determine source & source_id
              │
              ├─→ Create record object
              │       {
              │         source: 'weeks',
              │         source_id: 'week-123',
              │         content: { ... },
              │         metadata: { ... }
              │       }
              │
              ├─→ INSERT INTO ingested_results
              │       │
              │       └─→ Trigger: auto_increment_version()
              │           │
              │           ├─→ Find max(version) for source+source_id
              │           │
              │           └─→ Set version = max + 1
              │
              ├─→ Return new record with version
              │
              └─→ (Optional) Dual-write to legacy table
```

### Read Flow (Latest Version)

```
getLatestIngestedResult(source, source_id)
              │
              ├─→ Query ingested_results
              │   WHERE source = ?
              │     AND source_id = ?
              │     AND deleted = false
              │   ORDER BY version DESC
              │   LIMIT 1
              │
              ├─→ Return latest version
              │
              └─→ (Fallback) Query legacy table if not found
```

### Read Flow (All History)

```
getIngestedResultHistory(source, source_id)
              │
              ├─→ Query ingested_results
              │   WHERE source = ?
              │     AND source_id = ?
              │   ORDER BY version DESC
              │
              └─→ Return all versions (v3, v2, v1, ...)
```

## Versioning Example

When the same logical record is inserted multiple times:

```
Time: T1
┌────────────────────────────────────────────────┐
│ id: uuid-1                                      │
│ source: 'weeks'                                 │
│ source_id: 'week-1'                            │
│ content: { overallRoi: 10, ... }               │
│ version: 1                                      │
│ created_at: 2025-12-07 10:00:00               │
│ deleted: false                                  │
└────────────────────────────────────────────────┘

Time: T2 (same source_id, new data)
┌────────────────────────────────────────────────┐
│ id: uuid-2                                      │
│ source: 'weeks'                                 │
│ source_id: 'week-1'                            │
│ content: { overallRoi: 15, ... }               │
│ version: 2  ← Auto-incremented!                │
│ created_at: 2025-12-07 11:00:00               │
│ deleted: false                                  │
└────────────────────────────────────────────────┘

Time: T3 (same source_id, updated data)
┌────────────────────────────────────────────────┐
│ id: uuid-3                                      │
│ source: 'weeks'                                 │
│ source_id: 'week-1'                            │
│ content: { overallRoi: 20, ... }               │
│ version: 3  ← Auto-incremented!                │
│ created_at: 2025-12-07 12:00:00               │
│ deleted: false                                  │
└────────────────────────────────────────────────┘

Result: All 3 versions preserved!
Latest version (v3) returned by default queries.
History accessible via getIngestedResultHistory().
```

## Comparison: Old vs New System

### Old System (Destructive Upserts)

```
Record 1 (Initial):
┌────────────────────────┐
│ id: week-1             │
│ data: { roi: 10 }      │
└────────────────────────┘

Record 1 (After Upsert):
┌────────────────────────┐
│ id: week-1             │
│ data: { roi: 20 }  ←── OVERWRITES!
└────────────────────────┘

❌ Problem: Original data (roi: 10) is lost forever!
```

### New System (Append-Only)

```
Record 1 (Initial):
┌────────────────────────┐
│ id: uuid-1             │
│ source_id: week-1      │
│ version: 1             │
│ data: { roi: 10 }      │
└────────────────────────┘

Record 2 (New Version):
┌────────────────────────┐
│ id: uuid-2             │
│ source_id: week-1      │
│ version: 2             │
│ data: { roi: 20 }      │
└────────────────────────┘

✅ Solution: Both versions preserved!
   - Version 1 still exists
   - Version 2 is the latest
   - Complete history maintained
```

## Security Architecture

```
┌─────────────────────────────────────────────┐
│           Row Level Security (RLS)          │
├─────────────────────────────────────────────┤
│                                              │
│  Anonymous Users (anon):                    │
│  ✅ INSERT into ingested_results            │
│  ✅ SELECT non-deleted records              │
│  ❌ UPDATE                                   │
│  ❌ DELETE                                   │
│                                              │
│  Authenticated Users (authenticated):       │
│  ✅ INSERT                                   │
│  ✅ SELECT all (including deleted)          │
│  ✅ UPDATE (for soft-delete)                │
│  ❌ DELETE (hard delete)                     │
│                                              │
│  Service Role (service_role):               │
│  ✅ Full access (including hard DELETE)     │
│                                              │
└─────────────────────────────────────────────┘
```

## Performance Optimization

### Indexes Strategy

```
1. idx_ingested_results_source_source_id
   ↳ Fast lookup by source and source_id
   ↳ Used by: getLatestIngestedResult()

2. idx_ingested_results_created_at (DESC)
   ↳ Time-based queries
   ↳ Used by: getAllLatestIngestedResults()

3. idx_ingested_results_deleted (WHERE deleted = FALSE)
   ↳ Filter deleted records efficiently
   ↳ Partial index (only non-deleted)

4. idx_ingested_results_unique_version (UNIQUE)
   ↳ Prevent duplicate versions
   ↳ On (source, source_id, version)

5. idx_ingested_results_source_version (DESC)
   ↳ Quick version ordering
   ↳ Used by: getIngestedResultHistory()
```

### Query Performance

```
Operation                          | Complexity | Notes
-----------------------------------|------------|------------------
Insert new record                  | O(log n)   | B-tree insert
Get latest version                 | O(log n)   | Index seek + LIMIT 1
Get all latest (per source)        | O(n)       | Full scan + filter
Get history (all versions)         | O(v)       | v = # of versions
Count by source                    | O(n)       | Index-only scan
Soft delete                        | O(log n)   | Update by id
```

## Backward Compatibility Strategy

```
Phase 1: Introduction (Current)
┌─────────────────────────────────────┐
│ Write:                               │
│ ┌─────────────────────────────────┐ │
│ │ INSERT → ingested_results ✅    │ │
│ │ UPSERT → weeks (legacy) ✅      │ │
│ └─────────────────────────────────┘ │
│                                      │
│ Read:                                │
│ ┌─────────────────────────────────┐ │
│ │ TRY ingested_results ✅         │ │
│ │ FALLBACK weeks (legacy) ✅      │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

Phase 2: Migration (Optional)
┌─────────────────────────────────────┐
│ Migrate historical data:             │
│ weeks → ingested_results            │
│ picks → ingested_results            │
│ summaries → ingested_results        │
└─────────────────────────────────────┘

Phase 3: Full Adoption (Future)
┌─────────────────────────────────────┐
│ Write:                               │
│ ┌─────────────────────────────────┐ │
│ │ INSERT → ingested_results ✅    │ │
│ │ (legacy tables read-only)       │ │
│ └─────────────────────────────────┘ │
│                                      │
│ Read:                                │
│ ┌─────────────────────────────────┐ │
│ │ ingested_results only ✅        │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Benefits Summary

```
┌─────────────────────────────────────────────────┐
│  ✅ Data Preservation                           │
│     All historical data permanently stored      │
│                                                  │
│  ✅ Audit Trail                                 │
│     Complete history of all changes             │
│                                                  │
│  ✅ Time Travel                                 │
│     Query data as it existed at any point       │
│                                                  │
│  ✅ Safe Updates                                │
│     No risk of accidental data loss             │
│                                                  │
│  ✅ Rollback Support                            │
│     Can revert to previous versions             │
│                                                  │
│  ✅ Compliance Ready                            │
│     Meet regulatory requirements for history    │
│                                                  │
│  ✅ Zero Downtime                               │
│     Gradual migration with backward compat      │
│                                                  │
│  ✅ Performance                                 │
│     Optimized indexes for fast queries          │
└─────────────────────────────────────────────────┘
```

## Related Documentation

- **Migration Guide**: `MIGRATION_GUIDE.md` - Step-by-step setup
- **API Documentation**: `docs/INGESTION.md` - Detailed usage
- **SQL Migration**: `supabase/migrations/20251207_create_ingested_results.sql`
- **Tests**: `test/ingestion.test.ts` - Usage examples
