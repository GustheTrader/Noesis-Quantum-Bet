#!/usr/bin/env node
/**
 * Create Storage Buckets for Admin Ingestion
 * 
 * This script creates the required Supabase storage buckets:
 * - documents: For PDFs and Markdown files
 * - artifacts: For other file types
 * 
 * Usage: node scripts/create_buckets.ts
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ ERROR: Missing required environment variables');
    console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env file');
    process.exit(1);
}

// Create admin client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

interface BucketConfig {
    name: string;
    description: string;
    public: boolean;
    fileSizeLimit?: number;
    allowedMimeTypes?: string[];
}

const BUCKETS: BucketConfig[] = [
    {
        name: 'documents',
        description: 'Storage for PDF and Markdown files from admin ingestion',
        public: false,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB
        allowedMimeTypes: ['application/pdf', 'text/markdown', 'text/plain']
    },
    {
        name: 'artifacts',
        description: 'Storage for other file types and artifacts',
        public: false,
        fileSizeLimit: 100 * 1024 * 1024 // 100MB
    }
];

async function createBucket(config: BucketConfig): Promise<void> {
    console.log(`\n📦 Creating bucket: ${config.name}`);
    console.log(`   Description: ${config.description}`);
    console.log(`   Public: ${config.public}`);
    
    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
        console.error(`   ❌ Error listing buckets: ${listError.message}`);
        throw listError;
    }
    
    const bucketExists = existingBuckets?.some(b => b.name === config.name);
    
    if (bucketExists) {
        console.log(`   ℹ️  Bucket already exists, skipping creation`);
        return;
    }
    
    // Create the bucket
    const { data, error } = await supabaseAdmin.storage.createBucket(config.name, {
        public: config.public,
        fileSizeLimit: config.fileSizeLimit,
        allowedMimeTypes: config.allowedMimeTypes
    });
    
    if (error) {
        console.error(`   ❌ Error creating bucket: ${error.message}`);
        throw error;
    }
    
    console.log(`   ✅ Bucket created successfully`);
}

async function setupBucketPolicies(): Promise<void> {
    console.log('\n🔐 Setting up bucket policies...');
    console.log('   Note: RLS policies should be configured in Supabase Dashboard');
    console.log('   Recommended policies:');
    console.log('   - documents: Allow authenticated admin users to upload/read');
    console.log('   - documents: Allow public read for signed URLs');
    console.log('   - artifacts: Similar restrictions as documents');
}

async function main() {
    console.log('🚀 Supabase Storage Bucket Setup');
    console.log('================================\n');
    console.log(`Using Supabase URL: ${SUPABASE_URL}`);
    
    try {
        // Create all buckets
        for (const bucket of BUCKETS) {
            await createBucket(bucket);
        }
        
        // Display policy information
        await setupBucketPolicies();
        
        console.log('\n✅ All buckets created successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Configure bucket RLS policies in Supabase Dashboard if needed');
        console.log('   2. Test file upload using admin authentication');
        console.log('   3. Verify signed URLs are working correctly');
        
    } catch (error) {
        console.error('\n❌ Setup failed:', error);
        process.exit(1);
    }
}

// Run the script
main().catch(console.error);
