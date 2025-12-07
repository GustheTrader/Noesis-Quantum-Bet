/**
 * Ingestion API Endpoints
 * 
 * Protected endpoints for ingesting results into the append-only database.
 * All endpoints require admin authentication via JWT.
 */

import { Request, Response } from 'express';
import { getSupabaseServer } from '../lib/supabase-client';

export interface IngestRequest {
  source: string;
  source_id?: string;
  content: any;
  metadata?: any;
}

export interface IngestedResult {
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
 * POST /api/ingest/results
 * Insert a new result into the ingested_results table
 * This is append-only - each insert creates a new versioned record
 */
export async function ingestResult(req: Request, res: Response): Promise<void> {
  try {
    const { source, source_id, content, metadata } = req.body as IngestRequest;
    
    // Validate required fields
    if (!source) {
      res.status(400).json({
        success: false,
        error: 'source is required'
      });
      return;
    }
    
    if (!content) {
      res.status(400).json({
        success: false,
        error: 'content is required'
      });
      return;
    }
    
    // Get server client with service role
    const supabase = getSupabaseServer();
    
    // Insert the new record (version will be auto-incremented by trigger)
    const { data, error } = await supabase
      .from('ingested_results')
      .insert({
        source,
        source_id: source_id || null,
        content,
        metadata: metadata || {}
      })
      .select()
      .single();
    
    if (error) {
      console.error('Ingestion error:', error);
      res.status(500).json({
        success: false,
        error: `Database error: ${error.message}`
      });
      return;
    }
    
    res.status(201).json({
      success: true,
      data
    });
    
  } catch (error) {
    console.error('Unexpected ingestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * GET /api/ingest/results/latest
 * Fetch the latest non-deleted version for a given source and source_id
 * Query params: source (required), source_id (optional)
 */
export async function getLatestResult(req: Request, res: Response): Promise<void> {
  try {
    const { source, source_id } = req.query;
    
    // Validate required fields
    if (!source || typeof source !== 'string') {
      res.status(400).json({
        success: false,
        error: 'source query parameter is required'
      });
      return;
    }
    
    // Get server client
    const supabase = getSupabaseServer();
    
    // Build query
    let query = supabase
      .from('ingested_results')
      .select('*')
      .eq('source', source)
      .eq('deleted', false)
      .order('version', { ascending: false })
      .limit(1);
    
    // Add source_id filter if provided
    if (source_id) {
      query = query.eq('source_id', source_id);
    } else {
      query = query.is('source_id', null);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) {
      console.error('Query error:', error);
      res.status(500).json({
        success: false,
        error: `Database error: ${error.message}`
      });
      return;
    }
    
    if (!data) {
      res.status(404).json({
        success: false,
        error: 'No results found for the given source and source_id'
      });
      return;
    }
    
    res.json({
      success: true,
      data
    });
    
  } catch (error) {
    console.error('Unexpected query error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * GET /api/ingest/results/history
 * Fetch all versions for a given source and source_id
 * Query params: source (required), source_id (optional)
 */
export async function getResultHistory(req: Request, res: Response): Promise<void> {
  try {
    const { source, source_id } = req.query;
    
    // Validate required fields
    if (!source || typeof source !== 'string') {
      res.status(400).json({
        success: false,
        error: 'source query parameter is required'
      });
      return;
    }
    
    // Get server client
    const supabase = getSupabaseServer();
    
    // Build query
    let query = supabase
      .from('ingested_results')
      .select('*')
      .eq('source', source)
      .order('version', { ascending: false });
    
    // Add source_id filter if provided
    if (source_id) {
      query = query.eq('source_id', source_id);
    } else {
      query = query.is('source_id', null);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Query error:', error);
      res.status(500).json({
        success: false,
        error: `Database error: ${error.message}`
      });
      return;
    }
    
    res.json({
      success: true,
      data,
      count: data.length
    });
    
  } catch (error) {
    console.error('Unexpected query error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
