/**
 * Ingestion Database Module
 * 
 * Provides append-only, versioned storage operations for all ingested results.
 * This replaces destructive upsert operations with immutable inserts.
 */

import { supabase } from './supabase';

export interface IngestedResult {
  id?: string;
  source: 'weeks' | 'picks' | 'summaries' | 'manual' | 'api';
  source_id?: string;
  content: any;
  metadata?: any;
  version?: number;
  created_at?: string;
  replaced_by?: string | null;
  deleted?: boolean;
}

export interface IngestedResultRecord {
  id: string;
  source: string;
  source_id: string | null;
  content: any;
  metadata: any;
  version: number;
  created_at: string;
  replaced_by: string | null;
  deleted: boolean;
}

/**
 * Insert a new ingested result (append-only)
 * This creates a new versioned record without overwriting existing data
 */
export async function insertIngestedResult(
  source: 'weeks' | 'picks' | 'summaries' | 'manual' | 'api',
  content: any,
  sourceId?: string,
  metadata?: any
): Promise<{ data: IngestedResultRecord | null; error: any }> {
  try {
    const record: IngestedResult = {
      source,
      source_id: sourceId,
      content,
      metadata: metadata || {},
      deleted: false,
    };

    const { data, error } = await supabase
      .from('ingested_results')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Failed to insert ingested result:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception during insert:', err);
    return { data: null, error: err };
  }
}

/**
 * Get the latest version of a record by source and optional source_id
 */
export async function getLatestIngestedResult(
  source: string,
  sourceId?: string
): Promise<{ data: IngestedResultRecord | null; error: any }> {
  try {
    if (!sourceId) {
      // If no source_id, get most recent by created_at
      const { data, error } = await supabase
        .from('ingested_results')
        .select('*')
        .eq('source', source)
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return { data, error };
    }

    // If source_id provided, get highest version
    const { data, error } = await supabase
      .from('ingested_results')
      .select('*')
      .eq('source', source)
      .eq('source_id', sourceId)
      .eq('deleted', false)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    return { data, error };
  } catch (err) {
    console.error('Exception during getLatest:', err);
    return { data: null, error: err };
  }
}

/**
 * Get all versions of a record (history)
 */
export async function getIngestedResultHistory(
  source: string,
  sourceId: string
): Promise<{ data: IngestedResultRecord[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('ingested_results')
      .select('*')
      .eq('source', source)
      .eq('source_id', sourceId)
      .order('version', { ascending: false });

    return { data, error };
  } catch (err) {
    console.error('Exception during getHistory:', err);
    return { data: null, error: err };
  }
}

/**
 * Get all latest versions for a source (non-deleted)
 * Returns the most recent version of each unique source_id
 */
export async function getAllLatestIngestedResults(
  source: string
): Promise<{ data: IngestedResultRecord[] | null; error: any }> {
  try {
    // Use a query to get all records, then filter in memory for latest versions
    const { data: allRecords, error } = await supabase
      .from('ingested_results')
      .select('*')
      .eq('source', source)
      .eq('deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    if (!allRecords) {
      return { data: [], error: null };
    }

    // Group by source_id and keep only the latest version
    const latestMap = new Map<string, IngestedResultRecord>();
    
    for (const record of allRecords) {
      const key = record.source_id || record.id;
      
      if (!latestMap.has(key)) {
        latestMap.set(key, record);
      } else {
        const existing = latestMap.get(key)!;
        // Keep the one with higher version, or more recent created_at
        if (record.version > existing.version || 
            (record.version === existing.version && record.created_at > existing.created_at)) {
          latestMap.set(key, record);
        }
      }
    }

    return { data: Array.from(latestMap.values()), error: null };
  } catch (err) {
    console.error('Exception during getAllLatest:', err);
    return { data: null, error: err };
  }
}

/**
 * Soft-delete a record (sets deleted flag to true)
 */
export async function softDeleteIngestedResult(
  id: string
): Promise<{ data: any; error: any }> {
  try {
    const { data, error } = await supabase
      .from('ingested_results')
      .update({ deleted: true })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Exception during softDelete:', err);
    return { data: null, error: err };
  }
}

/**
 * Mark a record as replaced by a newer version
 */
export async function markAsReplaced(
  oldId: string,
  newId: string
): Promise<{ data: any; error: any }> {
  try {
    const { data, error } = await supabase
      .from('ingested_results')
      .update({ replaced_by: newId })
      .eq('id', oldId)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Exception during markAsReplaced:', err);
    return { data: null, error: err };
  }
}

/**
 * Helper: Extract content from ingested result
 */
export function extractContent<T = any>(result: IngestedResultRecord | null): T | null {
  return result?.content || null;
}

/**
 * Helper: Extract all contents from multiple records
 */
export function extractContents<T = any>(results: IngestedResultRecord[] | null): T[] {
  if (!results) return [];
  return results.map(r => r.content);
}

/**
 * Migration helper: Import existing data into ingested_results
 * This helps migrate from old tables to the new versioned system
 */
export async function migrateExistingData(
  source: 'weeks' | 'picks' | 'summaries',
  records: any[]
): Promise<{ success: number; failed: number; errors: any[] }> {
  let success = 0;
  let failed = 0;
  const errors: any[] = [];

  for (const record of records) {
    try {
      const { error } = await insertIngestedResult(
        source,
        record,
        record.id, // Use original id as source_id
        {
          migrated: true,
          migration_date: new Date().toISOString(),
          original_created_at: record.created_at,
        }
      );

      if (error) {
        failed++;
        errors.push({ record, error });
      } else {
        success++;
      }
    } catch (err) {
      failed++;
      errors.push({ record, error: err });
    }
  }

  return { success, failed, errors };
}
