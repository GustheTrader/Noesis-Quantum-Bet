# Admin Ingestion System Documentation

This document describes the admin-only ingestion system for the Noesis Quantum Bet application.

## Overview

The admin ingestion system provides a secure, append-only data storage mechanism for ingesting results into Supabase. Only authenticated admin users (currently GustheTrader) can add new records. All data is versioned and immutable, ensuring data integrity and transparency.

## Features

- **Admin-only access**: JWT-based authentication protects all ingestion endpoints
- **Append-only storage**: Records are never modified or deleted, only versioned
- **Automatic versioning**: Each new record for the same source+source_id gets an incremented version
- **Supabase Storage**: Separate buckets for documents (PDFs, Markdown) and artifacts
- **Row-level security**: Database policies ensure only the service role can write data
- **Signed URLs**: Secure, time-limited access to stored files

## Architecture

### Database Schema

The `ingested_results` table stores all ingested data:

```sql
CREATE TABLE public.ingested_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source text NOT NULL,              -- Source identifier (e.g., "nfl_picks")
    source_id text,                    -- Optional sub-identifier (e.g., "week_1")
    content jsonb NOT NULL,            -- The actual data
    metadata jsonb DEFAULT '{}'::jsonb, -- Additional metadata
    version integer NOT NULL DEFAULT 1, -- Auto-incremented per source+source_id
    created_at timestamptz NOT NULL DEFAULT now(),
    replaced_by uuid,                  -- Points to newer version if any
    deleted boolean NOT NULL DEFAULT false -- Soft delete flag
);
```

### Storage Buckets

Two private storage buckets are created:

1. **documents**: For PDFs, Markdown files, and text documents (50 MB limit)
2. **artifacts**: For JSON, CSV, ZIP files, and other artifacts (100 MB limit)

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- A Supabase project
- Supabase service role key (available in project settings)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin Authentication
ADMIN_PASSWORD=your-secure-password  # Change from default!

# JWT Configuration
APP_JWT_SECRET=your-random-secret-key  # Generate a random string
APP_JWT_EXPIRY=1h

# Storage Buckets
DOCUMENT_BUCKET_NAME=documents
ARTIFACT_BUCKET_NAME=artifacts

# Server
PORT=3001
```

**Security Warning**: Never commit `.env` to version control. The `.env.example` file uses placeholder values only.

### 3. Run Database Migration

In your Supabase project dashboard:

1. Go to **SQL Editor**
2. Copy the contents of `supabase/migrations/20251207_create_ingested_results_and_policies.sql`
3. Paste and run the SQL script
4. Verify the `ingested_results` table was created

### 4. Create Storage Buckets

Run the bucket creation script:

```bash
npm run create-buckets
```

This will create the `documents` and `artifacts` buckets with appropriate configurations.

### 5. Start the Admin API Server

```bash
npm run dev:server
```

The server will start on port 3001 (or the PORT specified in `.env`).

## Usage

### 1. Admin Login

First, obtain a JWT token by logging in:

```bash
curl -X POST http://localhost:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-admin-password"}'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "1h"
}
```

Save the token for subsequent requests.

### 2. Ingest a Result

Add a new result to the database:

```bash
curl -X POST http://localhost:3001/api/ingest/results \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "source": "nfl_picks",
    "source_id": "week_1_2025",
    "content": {
      "picks": [
        {"team": "Chiefs", "spread": -7, "confidence": 0.85}
      ]
    },
    "metadata": {
      "files": [
        {"path": "documents/week1.pdf", "type": "pdf"}
      ],
      "analyst": "GustheTrader"
    }
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "source": "nfl_picks",
    "source_id": "week_1_2025",
    "content": {...},
    "metadata": {...},
    "version": 1,
    "created_at": "2025-12-07T20:00:00Z",
    "deleted": false
  }
}
```

### 3. Get Latest Result

Retrieve the most recent version:

```bash
curl "http://localhost:3001/api/ingest/results/latest?source=nfl_picks&source_id=week_1_2025" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Get Result History

Retrieve all versions:

```bash
curl "http://localhost:3001/api/ingest/results/history?source=nfl_picks&source_id=week_1_2025" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Upload Files

Use the storage helpers in your code:

```typescript
import { uploadDocument } from './src/lib/supabase-storage';

const fileBuffer = Buffer.from('PDF content here');
const result = await uploadDocument(
  fileBuffer,
  'week1_picks.pdf',
  'application/pdf'
);

console.log('File URL:', result.signedUrl);
```

## API Reference

### POST /api/admin/login

Authenticate as admin and receive JWT token.

**Request Body:**
```json
{
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "token": "string",
  "expiresIn": "string"
}
```

### POST /api/ingest/results

Insert a new result (requires authentication).

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "source": "string (required)",
  "source_id": "string (optional)",
  "content": "any (required)",
  "metadata": "any (optional)"
}
```

### GET /api/ingest/results/latest

Get the latest version for a source+source_id (requires authentication).

**Query Parameters:**
- `source`: string (required)
- `source_id`: string (optional)

### GET /api/ingest/results/history

Get all versions for a source+source_id (requires authentication).

**Query Parameters:**
- `source`: string (required)
- `source_id`: string (optional)

## Security Best Practices

1. **Change default credentials**: Never use the default `ADMIN_PASSWORD=101010` in production
2. **Use strong JWT secret**: Generate a random, long string for `APP_JWT_SECRET`
3. **Keep service role key secure**: Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
4. **Use HTTPS in production**: Always use TLS/SSL for API requests
5. **Rotate credentials regularly**: Update passwords and secrets periodically
6. **Monitor access logs**: Keep track of who is accessing the admin endpoints
7. **Use environment variables**: Never commit secrets to version control

## Troubleshooting

### "SUPABASE_SERVICE_ROLE_KEY is not set" Error

Make sure you've created a `.env` file and added your service role key. You can find this in:
Supabase Dashboard → Settings → API → service_role key

### "Invalid token" Error

Your JWT token may have expired (default: 1 hour). Log in again to get a new token.

### "Database error" When Ingesting

1. Verify the migration was run successfully
2. Check that RLS policies are configured correctly
3. Ensure your service role key is correct

### Bucket Creation Fails

Make sure:
1. Your service role key is set correctly
2. You have permissions to create buckets in your Supabase project
3. The bucket names don't already exist

## Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
# Build the server
npm run build:server

# Run the production build
npm run server
```

## Support

For issues or questions, contact GustheTrader or open an issue in the repository.
