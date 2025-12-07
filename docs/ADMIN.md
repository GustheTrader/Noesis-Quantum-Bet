# Admin Ingestion System Documentation

## Overview

The admin ingestion system provides a secure, append-only mechanism for the admin user (GustheTrader) to add ingested results to the database. It implements:

- ✅ JWT-based authentication
- ✅ Append-only versioned storage
- ✅ File storage in Supabase buckets
- ✅ Environment-based configuration
- ✅ Row-level security (RLS)

## Setup Instructions

### 1. Environment Configuration

Copy `.env.example` to `.env` and configure your variables:

```bash
cp .env.example .env
```

Edit `.env` and set the following:

```env
# Admin Authentication
ADMIN_PASSWORD=your_strong_password_here

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Secret (generate a strong random string)
APP_JWT_SECRET=your_strong_random_secret_here

# Gemini AI API Key
API_KEY=your_gemini_api_key_here
```

⚠️ **IMPORTANT**: 
- Never commit `.env` to source control
- Change the default password `101010` in production
- Use a strong random secret for `APP_JWT_SECRET` (at least 32 characters)
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret - it has full database access

### 2. Database Migration

Run the migration to create the `ingested_results` table:

1. Open your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20251207_create_ingested_results_and_policies.sql`
4. Paste and run in the SQL Editor

This creates:
- `ingested_results` table with versioning
- Auto-increment trigger for versions
- RLS policies to prevent public INSERT
- Optional `admins` table for DB-backed authentication

### 3. Storage Buckets

Create the required storage buckets by running:

```bash
# Ensure you have environment variables set
npm install

# Run the bucket creation script
node scripts/create_buckets.ts
```

This creates two buckets:
- `documents`: For PDF and Markdown files (50MB limit)
- `artifacts`: For other file types (100MB limit)

Both buckets are private by default.

## Usage Guide

### Admin Login

To perform admin operations, you first need to obtain a JWT token:

**Endpoint**: `POST /api/admin/login`

**Request**:
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password": "your_admin_password"}'
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "1h"
}
```

Save this token - you'll need it for all admin operations. Tokens expire after 1 hour.

### Ingesting Results

Once you have a token, you can ingest results using the protected endpoint:

**Endpoint**: `POST /api/admin/ingest`

**Request**:
```bash
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "source": "pdf_upload",
    "source_id": "week-5-report",
    "content": {
      "title": "Week 5 Performance Report",
      "data": {
        "roi": 45.2,
        "profit": 1250
      }
    },
    "metadata": {
      "uploaded_by": "GustheTrader",
      "notes": "Strong performance this week"
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "version": 1,
    "created_at": "2025-12-07T20:00:00Z",
    "file_urls": []
  }
}
```

### Ingesting with Files

To include file uploads (PDF, Markdown):

```bash
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "source=pdf_upload" \
  -F "source_id=week-5-report" \
  -F "content={\"title\":\"Week 5\"}" \
  -F "metadata={\"notes\":\"test\"}" \
  -F "files=@/path/to/report.pdf"
```

Files are automatically uploaded to the `documents` bucket and URLs are added to `metadata.files`.

### Versioning Behavior

The system is **append-only** with automatic versioning:

1. First insert: `version = 1`
2. Same `source + source_id`: `version = 2`
3. Next insert: `version = 3`

**Example**:
```bash
# First insert
curl -X POST ... -d '{"source":"pdf","source_id":"week-5","content":{...}}'
# Response: version = 1

# Second insert with same source/source_id
curl -X POST ... -d '{"source":"pdf","source_id":"week-5","content":{...}}'
# Response: version = 2
```

All previous versions remain in the database for audit trail.

### Retrieving Ingested Results

Get all versions:
```bash
curl http://localhost:3000/api/ingest?source=pdf_upload&source_id=week-5-report
```

Get latest version only:
```bash
curl http://localhost:3000/api/ingest/latest?source=pdf_upload&source_id=week-5-report
```

## Security Best Practices

### 1. Password Security
- ✅ Change default password immediately
- ✅ Use strong passwords (12+ characters, mixed case, numbers, symbols)
- ✅ Rotate passwords periodically
- ❌ Never hardcode passwords in source code

### 2. JWT Secret
- ✅ Generate with: `openssl rand -base64 32`
- ✅ Store in environment variables only
- ✅ Rotate periodically (will invalidate existing tokens)
- ❌ Never commit to git

### 3. Service Role Key
- ✅ Use only in server-side code
- ✅ Never expose to client/browser
- ✅ Has full database access - treat like root password
- ❌ Never log or display in error messages

### 4. Token Management
- ✅ Tokens expire after 1 hour
- ✅ Store tokens securely (not in localStorage for web apps)
- ✅ Use HTTPS in production
- ✅ Implement token refresh if needed

### 5. File Security
- ✅ Buckets are private by default
- ✅ Files accessible only via signed URLs
- ✅ Validate file types and sizes
- ❌ Never expose bucket directly to public

## Database Schema

### ingested_results table

```sql
CREATE TABLE ingested_results (
    id UUID PRIMARY KEY,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    content JSONB NOT NULL,
    metadata JSONB NOT NULL,
    version INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE,
    replaced_by UUID REFERENCES ingested_results(id),
    deleted BOOLEAN NOT NULL DEFAULT false
);
```

**Fields**:
- `id`: Unique identifier for each record
- `source`: Source system (e.g., "pdf_upload", "api_import")
- `source_id`: ID within the source system
- `content`: Main data as JSONB
- `metadata`: Additional metadata including file URLs
- `version`: Auto-incremented for same source/source_id
- `created_at`: Timestamp of ingestion
- `replaced_by`: Reference to newer version (for soft updates)
- `deleted`: Soft delete flag

## Troubleshooting

### "Missing Authorization header"
- Include the JWT token in the Authorization header
- Format: `Authorization: Bearer YOUR_TOKEN`

### "Invalid or expired token"
- Token may have expired (1 hour lifetime)
- Login again to get a new token
- Check that APP_JWT_SECRET matches between login and verification

### "Database error: permission denied"
- Ensure migration has been run
- Verify RLS policies are set correctly
- Check that service role key is being used

### "Upload error"
- Verify buckets exist: `node scripts/create_buckets.ts`
- Check file size (documents: 50MB, artifacts: 100MB)
- Verify file MIME type is allowed

### "Admin client not initialized"
- Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
- Ensure dotenv is loading environment variables
- Verify environment file is named `.env` (not `.env.local`)

## Development Workflow

1. **Local Setup**
   ```bash
   npm install
   cp .env.example .env
   # Edit .env with your credentials
   node scripts/create_buckets.ts
   npm run dev
   ```

2. **Testing Authentication**
   ```bash
   # Login
   curl -X POST http://localhost:3000/api/admin/login \
     -H "Content-Type: application/json" \
     -d '{"password":"101010"}'
   
   # Save the token from response
   export TOKEN="your_token_here"
   ```

3. **Testing Ingestion**
   ```bash
   # Test insert
   curl -X POST http://localhost:3000/api/admin/ingest \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"source":"test","source_id":"1","content":{"test":"data"}}'
   
   # Verify in database
   # Check Supabase Dashboard > Table Editor > ingested_results
   ```

4. **Testing Versioning**
   ```bash
   # Insert twice with same source/source_id
   curl -X POST http://localhost:3000/api/admin/ingest \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"source":"test","source_id":"1","content":{"version":"v1"}}'
   
   curl -X POST http://localhost:3000/api/admin/ingest \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"source":"test","source_id":"1","content":{"version":"v2"}}'
   
   # Both should succeed with version 1 and 2
   ```

## API Reference

### POST /api/admin/login
Authenticate and get JWT token.

**Request Body**:
```typescript
{
  password: string
}
```

**Response**:
```typescript
{
  success: boolean
  token?: string
  expiresIn?: string
  error?: string
}
```

### POST /api/admin/ingest
Insert ingested result (protected).

**Headers**:
- `Authorization: Bearer <token>`

**Request Body**:
```typescript
{
  source: string
  source_id: string
  content: object
  metadata?: object
  files?: File[]
}
```

**Response**:
```typescript
{
  success: boolean
  data?: {
    id: string
    version: number
    created_at: string
    file_urls?: string[]
  }
  error?: string
}
```

### GET /api/ingest
Get all versions of ingested results.

**Query Parameters**:
- `source`: Source identifier
- `source_id`: Source-specific ID

**Response**:
```typescript
{
  success: boolean
  data?: Array<IngestedResult>
  error?: string
}
```

### GET /api/ingest/latest
Get latest version only.

**Query Parameters**:
- `source`: Source identifier
- `source_id`: Source-specific ID

**Response**:
```typescript
{
  success: boolean
  data?: IngestedResult
  error?: string
}
```

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review Supabase logs in dashboard
3. Check browser/server console for errors
4. Verify environment variables are set correctly

## Changelog

### 2025-12-07
- Initial implementation
- JWT-based authentication
- Append-only ingested_results table
- Storage bucket support
- File upload integration
