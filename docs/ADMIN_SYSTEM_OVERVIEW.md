# Admin Ingestion System Overview

## What is This?

The Admin Ingestion System is a secure, server-side authentication and data management layer that allows only authorized administrators (specifically GustheTrader) to ingest betting performance data, upload documents, and manage the application's data store.

## Key Features

### 🔐 Security First
- **JWT-based authentication**: Short-lived tokens (1 hour) for admin operations
- **Environment-based secrets**: No hardcoded passwords or keys in source code
- **Service role isolation**: Database admin operations isolated to server-side only
- **Row-level security (RLS)**: Public users cannot insert data, only read

### 📝 Append-Only Storage
- **Versioned data**: Every ingestion creates a new version, never overwrites
- **Audit trail**: Complete history of all data ingestions
- **No destructive updates**: Previous versions remain intact
- **Automatic versioning**: Database trigger handles version increments

### 📁 File Management
- **Dedicated storage buckets**: Separate buckets for documents and artifacts
- **Private by default**: Files not publicly accessible without signed URLs
- **Integrated uploads**: File uploads automatically linked to ingestion records
- **Type validation**: Enforce allowed file types (PDF, Markdown, etc.)

### 🏗️ Modular Architecture
- **Framework agnostic**: Works with Express, Next.js, Cloudflare Workers, etc.
- **TypeScript first**: Fully typed for better developer experience
- **Separation of concerns**: Auth, storage, and ingestion are separate modules
- **Easy integration**: Simple import and use in your API routes

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Application                      │
│                    (React/Vite Frontend)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP/HTTPS
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     API Server Layer                         │
│  (Express/Next.js/Cloudflare Workers/Custom)                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Admin Login Endpoint                       │  │
│  │  POST /api/admin/login                              │  │
│  │  ▸ Validates password                                │  │
│  │  ▸ Issues JWT token                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Admin Ingestion Endpoint                   │  │
│  │  POST /api/admin/ingest                             │  │
│  │  ▸ Verifies JWT token                                │  │
│  │  ▸ Uploads files to storage                          │  │
│  │  ▸ Inserts versioned record                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     src/server/admin-auth.ts                         │  │
│  │  • adminLogin()                                       │  │
│  │  • verifyAdminToken()                                 │  │
│  │  • requireAdminAuth()                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     src/api/ingest.ts                                │  │
│  │  • ingestResult()                                     │  │
│  │  • getIngestedResults()                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     src/lib/supabase-storage.ts                      │  │
│  │  • uploadDocument()                                   │  │
│  │  • getSignedUrl()                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Service Role Key
                         │ (Server-side only)
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Supabase Backend                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ingested_results table                              │  │
│  │  • Append-only with versioning                        │  │
│  │  • RLS: Public SELECT, No public INSERT              │  │
│  │  • Auto-increment trigger                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Storage Buckets                                      │  │
│  │  • documents/ (PDFs, Markdown)                        │  │
│  │  • artifacts/ (Other files)                           │  │
│  │  • Private by default                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  admins table (optional)                             │  │
│  │  • DB-backed admin users                              │  │
│  │  • Hashed passwords                                   │  │
│  │  • Service role access only                           │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Admin Authentication Flow

```
User                    API Server                  JWT Module
  │                         │                           │
  ├─POST /api/admin/login──▶│                           │
  │  {password: "xxx"}      │                           │
  │                         ├─adminLogin(password)─────▶│
  │                         │                           │
  │                         │                  ┌────────┴────────┐
  │                         │                  │ Verify password │
  │                         │                  │ Generate JWT    │
  │                         │                  └────────┬────────┘
  │                         │◀─{token, expiresIn}──────┤
  │◀─{success, token}──────┤                           │
  │                         │                           │
```

### 2. Ingestion Flow

```
Admin Client            API Server              Storage        Database
    │                       │                      │              │
    ├─POST /api/admin/ingest (with JWT)─────────▶│              │
    │  {source, source_id,  │                      │              │
    │   content, files}     │                      │              │
    │                       │                      │              │
    │                  ┌────┴──────────┐          │              │
    │                  │ Verify JWT    │          │              │
    │                  │ requireAuth() │          │              │
    │                  └────┬──────────┘          │              │
    │                       │                      │              │
    │                       ├─Upload files────────▶│              │
    │                       │                      │              │
    │                       │◀─{url, path}─────────┤              │
    │                       │                      │              │
    │                       ├─INSERT ingested_results─────────────▶│
    │                       │  + metadata.files    │              │
    │                       │                      │         ┌────┴─────┐
    │                       │                      │         │ Trigger  │
    │                       │                      │         │ auto-inc │
    │                       │                      │         │ version  │
    │                       │                      │         └────┬─────┘
    │                       │◀─{id, version, created_at}──────────┤
    │◀─{success, data}──────┤                      │              │
    │                       │                      │              │
```

### 3. Version Management

```
First Insert:
  source="pdf_upload", source_id="week-5"
  → version = 1

Second Insert (same source + source_id):
  source="pdf_upload", source_id="week-5"
  → version = 2 (auto-incremented by trigger)

Database State:
┌────────┬─────────────┬───────────┬─────────┬─────────────┐
│ id     │ source      │ source_id │ version │ content     │
├────────┼─────────────┼───────────┼─────────┼─────────────┤
│ uuid-1 │ pdf_upload  │ week-5    │ 1       │ {...}       │
│ uuid-2 │ pdf_upload  │ week-5    │ 2       │ {...}       │
└────────┴─────────────┴───────────┴─────────┴─────────────┘

Both rows persist - append-only!
```

## Security Model

### Environment Variables (`.env`)
```env
# Required for production
ADMIN_PASSWORD=<strong_password>        # Admin authentication
APP_JWT_SECRET=<random_32+_chars>       # JWT signing key
SUPABASE_SERVICE_ROLE_KEY=<from_supabase> # Full DB access

# Configuration
SUPABASE_URL=<your_project_url>
SUPABASE_ANON_KEY=<public_key>
```

### Access Control Matrix

| User Role    | Login | Read Data | Insert Data | Upload Files | Admin Panel |
|-------------|-------|-----------|-------------|--------------|-------------|
| Anonymous   | ❌    | ✅        | ❌          | ❌           | ❌          |
| Authenticated| ❌   | ✅        | ❌          | ❌           | ❌          |
| Admin (JWT) | ✅    | ✅        | ✅          | ✅           | ✅          |

### Database Security (RLS Policies)

```sql
-- ingested_results table
ALTER TABLE ingested_results ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can read non-deleted records
CREATE POLICY "Public can read non-deleted ingested results"
    ON ingested_results FOR SELECT
    USING (deleted = false);

-- Policy 2: No public INSERT (revoked at table level)
REVOKE INSERT ON ingested_results FROM anon;
REVOKE INSERT ON ingested_results FROM authenticated;

-- Service role bypasses RLS (used by admin API)
```

### Storage Security

```typescript
// Buckets created with:
{
  public: false,  // Not publicly accessible
  fileSizeLimit: 50 * 1024 * 1024,  // 50MB for documents
  allowedMimeTypes: ['application/pdf', 'text/markdown', 'text/plain']
}

// Access via signed URLs only (temporary, expiring links)
const { url } = await getSignedUrl(filePath, 3600); // 1 hour expiry
```

## Integration Guide

### Step 1: Set Up Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and set your values
nano .env
```

### Step 2: Run Database Migration

```sql
-- Execute in Supabase SQL Editor
-- File: supabase/migrations/20251207_create_ingested_results_and_policies.sql
```

### Step 3: Create Storage Buckets

```bash
npm run create-buckets
```

### Step 4: Choose Your Server Framework

See `src/server/example-endpoints.ts` for implementations:
- Express.js
- Next.js API Routes
- Cloudflare Workers
- Standalone Node.js

### Step 5: Implement Endpoints

```typescript
// Example Express.js setup
import express from 'express';
import { handleAdminLoginRequest } from './src/server/admin-auth';
import { handleIngestRequest } from './src/api/ingest';

const app = express();
app.use(express.json());

app.post('/api/admin/login', async (req, res) => {
    const response = await handleAdminLoginRequest(req.body);
    res.status(response.success ? 200 : 401).json(response);
});

app.post('/api/admin/ingest', async (req, res) => {
    const response = await handleIngestRequest(req.body, req.headers.authorization);
    res.status(response.success ? 200 : 400).json(response);
});

app.listen(3001);
```

### Step 6: Test the Flow

```bash
# 1. Login
curl -X POST http://localhost:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_password"}'

# 2. Save token
export TOKEN="<token_from_response>"

# 3. Ingest data
curl -X POST http://localhost:3001/api/admin/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source":"test","source_id":"1","content":{"test":"data"}}'
```

## File Structure

```
Noesis-Quantum-Bet/
├── .env.example              # Environment template
├── .env                      # Your secrets (not committed)
├── docs/
│   ├── ADMIN.md             # Detailed admin documentation
│   └── ADMIN_SYSTEM_OVERVIEW.md  # This file
├── src/
│   ├── api/
│   │   └── ingest.ts        # Ingestion API logic
│   ├── lib/
│   │   └── supabase-storage.ts  # Storage helpers
│   └── server/
│       ├── admin-auth.ts    # JWT authentication
│       └── example-endpoints.ts  # Integration examples
├── scripts/
│   └── create_buckets.ts    # Bucket creation script
├── supabase/
│   └── migrations/
│       └── 20251207_create_ingested_results_and_policies.sql
└── test/
    └── admin-ingest.test.ts # Integration tests
```

## FAQ

### Q: Why not use Supabase Auth directly?
**A:** We want a simple, single-admin setup without managing multiple users. This approach uses environment variables for the password and JWT for session management, which is simpler for a single admin use case.

### Q: Can I have multiple admin users?
**A:** Yes! The migration includes an optional `admins` table for DB-backed authentication. You can:
1. Insert admin users with hashed passwords
2. Modify `adminLogin()` to query the database instead of checking env variable
3. Use the provided `hashPassword()` and `verifyPassword()` functions

### Q: What if my JWT token expires?
**A:** Tokens expire after 1 hour. Simply call the login endpoint again to get a new token. You could implement refresh tokens for longer sessions.

### Q: Can public users read ingested data?
**A:** Yes, by design. The RLS policy allows anyone to SELECT non-deleted records. If you need to restrict this, modify the RLS policy in the migration.

### Q: How do I delete data?
**A:** The system is append-only, so we use soft deletes. Update the `deleted` flag:
```sql
UPDATE ingested_results SET deleted = true WHERE id = '<uuid>';
```

### Q: Can I use this with my existing Supabase tables?
**A:** Absolutely! This system is additive. It creates new tables (`ingested_results`, `admins`) and buckets without affecting existing data.

### Q: What about file size limits?
**A:** Default limits:
- `documents` bucket: 50MB
- `artifacts` bucket: 100MB

Adjust in `scripts/create_buckets.ts` before running.

### Q: Is this production-ready?
**A:** The code is production-ready with these caveats:
1. Change default passwords immediately
2. Use HTTPS in production
3. Set strong `APP_JWT_SECRET` (32+ characters)
4. Consider implementing token refresh for better UX
5. Add rate limiting to prevent brute force attacks

## Next Steps

1. ✅ **Read the documentation**: Start with `docs/ADMIN.md`
2. ✅ **Set up environment**: Configure `.env` file
3. ✅ **Run migration**: Create database tables
4. ✅ **Create buckets**: Run bucket creation script
5. ✅ **Implement endpoints**: Choose your framework and integrate
6. ✅ **Test locally**: Use curl or Postman to test the flow
7. ✅ **Deploy**: Deploy your API server with environment variables
8. ✅ **Monitor**: Watch logs for any issues

## Support & Troubleshooting

See `docs/ADMIN.md` for detailed troubleshooting steps.

Common issues:
- **"Missing Authorization header"**: Include JWT in `Authorization: Bearer <token>` header
- **"Invalid or expired token"**: Token expired (1h) - login again
- **"Admin client not initialized"**: Check environment variables are loaded
- **Upload errors**: Verify buckets exist with `npm run create-buckets`

## Security Checklist

Before deploying to production:

- [ ] Change `ADMIN_PASSWORD` from default `101010`
- [ ] Generate strong `APP_JWT_SECRET` (at least 32 characters)
- [ ] Verify `.env` is in `.gitignore`
- [ ] Use HTTPS for all API endpoints
- [ ] Keep `SUPABASE_SERVICE_ROLE_KEY` secret (server-side only)
- [ ] Test RLS policies (verify public can't INSERT)
- [ ] Test JWT expiration (after 1 hour)
- [ ] Review file upload limits and MIME types
- [ ] Set up monitoring and logging
- [ ] Consider adding rate limiting
- [ ] Review and adjust CORS settings

---

**Last Updated**: 2025-12-07  
**Version**: 1.0.0  
**Maintainer**: GustheTrader
