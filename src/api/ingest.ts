/**
 * Admin Ingestion API
 * 
 * Protected API endpoints for ingesting results into the append-only database.
 * Requires admin JWT authentication.
 * 
 * DO NOT expose to client-side code directly.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireAdminAuth } from '../server/admin-auth';
import { uploadDocument, initAdminClient } from '../lib/supabase-storage';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Initialize admin client for storage operations
let adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
    if (!adminClient && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        // Also initialize storage client
        initAdminClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }
    
    if (!adminClient) {
        throw new Error('Admin client not initialized');
    }
    
    return adminClient;
}

/**
 * Structure for ingested result
 */
interface IngestRequest {
    source: string;
    source_id: string;
    content: Record<string, any>;
    metadata?: Record<string, any>;
    files?: File[];
}

interface IngestResponse {
    success: boolean;
    data?: {
        id: string;
        version: number;
        created_at: string;
        file_urls?: string[];
    };
    error?: string;
}

/**
 * Insert a new ingested result (append-only)
 * Uses service role to bypass RLS and insert directly
 * 
 * @param request - Ingestion request data
 * @param authHeader - Authorization header for admin verification
 * @returns Response with inserted data or error
 */
export async function ingestResult(
    request: IngestRequest,
    authHeader: string | null | undefined
): Promise<IngestResponse> {
    try {
        // 1. Verify admin authentication
        const authResult = requireAdminAuth(authHeader);
        
        if (!authResult.isAuthorized) {
            return {
                success: false,
                error: authResult.error || 'Unauthorized'
            };
        }
        
        // 2. Validate request
        if (!request.source || !request.source_id || !request.content) {
            return {
                success: false,
                error: 'Missing required fields: source, source_id, content'
            };
        }
        
        const client = getAdminClient();
        
        // 3. Handle file uploads if present
        const fileUrls: string[] = [];
        
        if (request.files && request.files.length > 0) {
            for (const file of request.files) {
                const uploadResult = await uploadDocument(file, request.source);
                
                if (uploadResult.error) {
                    console.error(`Failed to upload file ${file.name}:`, uploadResult.error);
                    // Continue with other files, but log the error
                } else {
                    fileUrls.push(uploadResult.url);
                }
            }
        }
        
        // 4. Prepare metadata with file URLs
        const metadata = {
            ...request.metadata,
            files: fileUrls.length > 0 ? fileUrls : undefined,
            ingested_by: authResult.payload?.username,
            ingested_at: new Date().toISOString()
        };
        
        // 5. Insert into ingested_results table (append-only)
        const { data, error } = await client
            .from('ingested_results')
            .insert({
                source: request.source,
                source_id: request.source_id,
                content: request.content,
                metadata: metadata
            })
            .select()
            .single();
        
        if (error) {
            console.error('Database insert error:', error);
            return {
                success: false,
                error: `Database error: ${error.message}`
            };
        }
        
        // 6. Return success response
        return {
            success: true,
            data: {
                id: data.id,
                version: data.version,
                created_at: data.created_at,
                file_urls: fileUrls
            }
        };
        
    } catch (error: any) {
        console.error('Ingestion error:', error);
        return {
            success: false,
            error: error.message || 'Internal server error'
        };
    }
}

/**
 * Get ingested results by source and source_id
 * Returns all versions (append-only history)
 * 
 * @param source - Source identifier
 * @param source_id - Source-specific ID
 * @param authHeader - Optional auth header (public read is allowed for non-deleted)
 * @returns Array of ingested results
 */
export async function getIngestedResults(
    source: string,
    source_id: string,
    authHeader?: string | null
): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
}> {
    try {
        const client = getAdminClient();
        
        // Query ingested results (public read is allowed by RLS policy)
        const { data, error } = await client
            .from('ingested_results')
            .select('*')
            .eq('source', source)
            .eq('source_id', source_id)
            .eq('deleted', false)
            .order('version', { ascending: true });
        
        if (error) {
            return {
                success: false,
                error: error.message
            };
        }
        
        return {
            success: true,
            data: data || []
        };
        
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get the latest version of an ingested result
 * 
 * @param source - Source identifier
 * @param source_id - Source-specific ID
 * @returns Latest ingested result
 */
export async function getLatestIngestedResult(
    source: string,
    source_id: string
): Promise<{
    success: boolean;
    data?: any;
    error?: string;
}> {
    try {
        const client = getAdminClient();
        
        const { data, error } = await client
            .from('ingested_results')
            .select('*')
            .eq('source', source)
            .eq('source_id', source_id)
            .eq('deleted', false)
            .order('version', { ascending: false })
            .limit(1)
            .single();
        
        if (error) {
            return {
                success: false,
                error: error.message
            };
        }
        
        return {
            success: true,
            data
        };
        
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Example HTTP handler for POST /api/admin/ingest
 * 
 * @example
 * const response = await handleIngestRequest(req.body, req.headers.authorization);
 * res.status(response.success ? 200 : 400).json(response);
 */
export async function handleIngestRequest(
    body: IngestRequest,
    authHeader: string | null | undefined
): Promise<IngestResponse> {
    return ingestResult(body, authHeader);
}
