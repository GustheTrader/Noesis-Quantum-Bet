/**
 * Supabase Storage Helper Functions
 * 
 * Provides utilities for uploading and managing files in Supabase storage buckets.
 * Used by admin ingestion flow to store PDF and Markdown documents.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These will be loaded from environment variables
let supabaseAdmin: SupabaseClient | null = null;

/**
 * Initialize the admin Supabase client with service role key
 * Should only be called server-side
 */
export function initAdminClient(url: string, serviceRoleKey: string): SupabaseClient {
    if (!supabaseAdmin) {
        supabaseAdmin = createClient(url, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    }
    return supabaseAdmin;
}

/**
 * Get the admin Supabase client instance
 */
export function getAdminClient(): SupabaseClient {
    if (!supabaseAdmin) {
        throw new Error('Admin client not initialized. Call initAdminClient first.');
    }
    return supabaseAdmin;
}

/**
 * Upload a file to the documents bucket
 * 
 * @param file - File object to upload
 * @param folder - Optional folder path within the bucket
 * @returns Object with file path and public URL
 */
export async function uploadDocument(
    file: File, 
    folder: string = ''
): Promise<{ path: string; url: string; error?: string }> {
    try {
        const client = getAdminClient();
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 11);
        const extension = file.name.split('.').pop();
        const fileName = `${timestamp}_${randomId}.${extension}`;
        const filePath = folder ? `${folder}/${fileName}` : fileName;
        
        // Upload file to documents bucket
        const { data, error } = await client.storage
            .from('documents')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) {
            console.error('Upload error:', error);
            return { path: '', url: '', error: error.message };
        }
        
        // Get public URL (or signed URL for private buckets)
        const { data: { publicUrl } } = client.storage
            .from('documents')
            .getPublicUrl(data.path);
        
        return {
            path: data.path,
            url: publicUrl
        };
    } catch (error: any) {
        console.error('Upload exception:', error);
        return { path: '', url: '', error: error.message };
    }
}

/**
 * Generate a signed URL for a file in the documents bucket
 * Useful for private files that need temporary access
 * 
 * @param filePath - Path to the file in the bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function getSignedUrl(
    filePath: string,
    expiresIn: number = 3600
): Promise<{ url: string; error?: string }> {
    try {
        const client = getAdminClient();
        
        const { data, error } = await client.storage
            .from('documents')
            .createSignedUrl(filePath, expiresIn);
        
        if (error) {
            return { url: '', error: error.message };
        }
        
        return { url: data.signedUrl };
    } catch (error: any) {
        return { url: '', error: error.message };
    }
}

/**
 * Upload a file to the artifacts bucket
 * 
 * @param file - File object to upload
 * @param folder - Optional folder path within the bucket
 * @returns Object with file path and public URL
 */
export async function uploadArtifact(
    file: File,
    folder: string = ''
): Promise<{ path: string; url: string; error?: string }> {
    try {
        const client = getAdminClient();
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 11);
        const extension = file.name.split('.').pop();
        const fileName = `${timestamp}_${randomId}.${extension}`;
        const filePath = folder ? `${folder}/${fileName}` : fileName;
        
        // Upload file to artifacts bucket
        const { data, error } = await client.storage
            .from('artifacts')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) {
            return { path: '', url: '', error: error.message };
        }
        
        // Get public URL
        const { data: { publicUrl } } = client.storage
            .from('artifacts')
            .getPublicUrl(data.path);
        
        return {
            path: data.path,
            url: publicUrl
        };
    } catch (error: any) {
        return { path: '', url: '', error: error.message };
    }
}

/**
 * Delete a file from storage
 * 
 * @param bucket - Bucket name ('documents' or 'artifacts')
 * @param filePath - Path to the file in the bucket
 * @returns Success status
 */
export async function deleteFile(
    bucket: 'documents' | 'artifacts',
    filePath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const client = getAdminClient();
        
        const { error } = await client.storage
            .from(bucket)
            .remove([filePath]);
        
        if (error) {
            return { success: false, error: error.message };
        }
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * List files in a bucket folder
 * 
 * @param bucket - Bucket name
 * @param folder - Folder path (optional)
 * @returns Array of file objects
 */
export async function listFiles(
    bucket: 'documents' | 'artifacts',
    folder: string = ''
): Promise<{ files: any[]; error?: string }> {
    try {
        const client = getAdminClient();
        
        const { data, error } = await client.storage
            .from(bucket)
            .list(folder);
        
        if (error) {
            return { files: [], error: error.message };
        }
        
        return { files: data || [] };
    } catch (error: any) {
        return { files: [], error: error.message };
    }
}
 * Utilities for uploading files and generating signed URLs
 * for documents and artifacts stored in Supabase Storage buckets.
 */

import { getSupabaseServer } from './supabase-client';
import * as dotenv from 'dotenv';

dotenv.config();

const DOCUMENT_BUCKET_NAME = process.env.DOCUMENT_BUCKET_NAME || 'documents';
const ARTIFACT_BUCKET_NAME = process.env.ARTIFACT_BUCKET_NAME || 'artifacts';

export interface UploadResult {
  success: boolean;
  path?: string;
  signedUrl?: string;
  error?: string;
}

/**
 * Upload a file to a Supabase Storage bucket
 * 
 * @param bucketName - Name of the bucket (documents or artifacts)
 * @param file - File buffer or Blob to upload
 * @param fileName - Name/path for the file in storage
 * @param contentType - MIME type of the file
 * @returns Upload result with signed URL if successful
 */
export async function uploadFile(
  bucketName: string,
  file: Buffer | Blob,
  fileName: string,
  contentType: string = 'application/octet-stream'
): Promise<UploadResult> {
  try {
    const supabase = getSupabaseServer();
    
    // Upload the file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        contentType,
        upsert: false // Don't overwrite existing files
      });
    
    if (uploadError) {
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`
      };
    }
    
    // Generate a signed URL valid for 1 year
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(uploadData.path, 31536000); // 1 year in seconds
    
    if (urlError) {
      return {
        success: false,
        path: uploadData.path,
        error: `URL generation failed: ${urlError.message}`
      };
    }
    
    return {
      success: true,
      path: uploadData.path,
      signedUrl: urlData.signedUrl
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Upload a document (PDF, Markdown, etc.) to the documents bucket
 */
export async function uploadDocument(
  file: Buffer | Blob,
  fileName: string,
  contentType: string = 'application/pdf'
): Promise<UploadResult> {
  return uploadFile(DOCUMENT_BUCKET_NAME, file, fileName, contentType);
}

/**
 * Upload an artifact to the artifacts bucket
 */
export async function uploadArtifact(
  file: Buffer | Blob,
  fileName: string,
  contentType: string = 'application/octet-stream'
): Promise<UploadResult> {
  return uploadFile(ARTIFACT_BUCKET_NAME, file, fileName, contentType);
}

/**
 * Get a signed URL for an existing file
 * 
 * @param bucketName - Name of the bucket
 * @param filePath - Path to the file in storage
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL or error
 */
export async function getSignedUrl(
  bucketName: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<{ url?: string; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn);
    
    if (error) {
      return { error: error.message };
    }
    
    return { url: data.signedUrl };
    
  } catch (error) {
    return {
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * List files in a bucket directory
 */
export async function listFiles(
  bucketName: string,
  path: string = ''
): Promise<{ files?: any[]; error?: string }> {
  try {
    const supabase = getSupabaseServer();
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(path);
    
    if (error) {
      return { error: error.message };
    }
    
    return { files: data };
    
  } catch (error) {
    return {
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export { DOCUMENT_BUCKET_NAME, ARTIFACT_BUCKET_NAME };
