/**
 * Supabase Storage Helper Functions
 * 
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
