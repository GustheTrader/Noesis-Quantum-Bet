/**
 * Create Storage Buckets Script
 * 
 * Creates the required Supabase Storage buckets for documents and artifacts.
 * Run this script once after setting up your Supabase project.
 * 
 * Usage: npm run create-buckets
 */

import { getSupabaseServer } from '../src/lib/supabase-client';
import * as dotenv from 'dotenv';

dotenv.config();

const DOCUMENT_BUCKET_NAME = process.env.DOCUMENT_BUCKET_NAME || 'documents';
const ARTIFACT_BUCKET_NAME = process.env.ARTIFACT_BUCKET_NAME || 'artifacts';

interface BucketConfig {
  name: string;
  public: boolean;
  fileSizeLimit?: number;
  allowedMimeTypes?: string[];
}

const bucketsToCreate: BucketConfig[] = [
  {
    name: DOCUMENT_BUCKET_NAME,
    public: false, // Private bucket, access via signed URLs
    fileSizeLimit: 52428800, // 50 MB
    allowedMimeTypes: [
      'application/pdf',
      'text/markdown',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  },
  {
    name: ARTIFACT_BUCKET_NAME,
    public: false, // Private bucket, access via signed URLs
    fileSizeLimit: 104857600, // 100 MB
    allowedMimeTypes: [
      'application/json',
      'application/zip',
      'application/x-tar',
      'text/csv',
      'application/octet-stream'
    ]
  }
];

async function createBucket(config: BucketConfig): Promise<void> {
  try {
    const supabase = getSupabaseServer();
    
    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabase
      .storage
      .listBuckets();
    
    if (listError) {
      console.error(`❌ Error listing buckets:`, listError.message);
      return;
    }
    
    const bucketExists = existingBuckets?.some(b => b.name === config.name);
    
    if (bucketExists) {
      console.log(`✅ Bucket '${config.name}' already exists`);
      return;
    }
    
    // Create the bucket
    const { data, error } = await supabase
      .storage
      .createBucket(config.name, {
        public: config.public,
        fileSizeLimit: config.fileSizeLimit,
        allowedMimeTypes: config.allowedMimeTypes
      });
    
    if (error) {
      console.error(`❌ Error creating bucket '${config.name}':`, error.message);
      return;
    }
    
    console.log(`✅ Successfully created bucket '${config.name}'`);
    
  } catch (error) {
    console.error(`❌ Unexpected error creating bucket '${config.name}':`, error);
  }
}

async function main() {
  console.log('🚀 Starting bucket creation...\n');
  
  // Check environment variables
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is not set');
    console.error('   Please set it in your .env file');
    process.exit(1);
  }
  
  console.log(`Creating buckets:`);
  console.log(`  - ${DOCUMENT_BUCKET_NAME} (documents)`);
  console.log(`  - ${ARTIFACT_BUCKET_NAME} (artifacts)\n`);
  
  // Create each bucket
  for (const config of bucketsToCreate) {
    await createBucket(config);
  }
  
  console.log('\n✨ Bucket creation complete!');
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
