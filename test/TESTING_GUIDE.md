# Admin Ingestion System - Testing Guide

This guide provides manual testing procedures and test case templates for the admin ingestion system.

## Prerequisites

Before testing, ensure you have:

1. ✅ Copied `.env.example` to `.env` and configured all variables
2. ✅ Run the database migration in Supabase SQL Editor
3. ✅ Created storage buckets: `npm run create-buckets`
4. ✅ Set up your API server (Express, Next.js, or similar)

## Manual Test Cases

### Test 1: Admin Authentication

#### 1.1 - Login with Invalid Password

**Request:**
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"wrong_password"}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid password"
}
```

**Status Code:** 401

#### 1.2 - Login with Correct Password

**Request:**
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_admin_password"}'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "1h"
}
```

**Status Code:** 200

**Verification:**
- Token should be a valid JWT string
- Token should decode to show `role: "admin"` and `username: "GustheTrader"`

#### 1.3 - Verify Token Structure

**Command:**
```bash
# Save token from previous test
TOKEN="<your_token_here>"

# Decode JWT (using jwt.io or command line)
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
```

**Expected Output:**
```json
{
  "role": "admin",
  "username": "GustheTrader",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Test 2: Protected Endpoints

#### 2.1 - Access Ingestion Without Token

**Request:**
```bash
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Content-Type: application/json" \
  -d '{"source":"test","source_id":"1","content":{"test":"data"}}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Missing Authorization header"
}
```

**Status Code:** 400 or 401

#### 2.2 - Access Ingestion With Invalid Token

**Request:**
```bash
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid.jwt.token" \
  -d '{"source":"test","source_id":"1","content":{"test":"data"}}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**Status Code:** 400 or 401

#### 2.3 - Access Ingestion With Valid Token

**Request:**
```bash
# First, get a valid token
TOKEN=$(curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_admin_password"}' | jq -r .token)

# Then use it
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "source": "test",
    "source_id": "1",
    "content": {"test": "data", "value": 123}
  }'
```

**Expected Response:**
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

**Status Code:** 200

### Test 3: Append-Only Versioning

#### 3.1 - Insert First Version

**Request:**
```bash
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "versioning_test",
    "source_id": "item_1",
    "content": {"version": "v1", "data": "first version"}
  }'
```

**Expected:**
- `success: true`
- `version: 1`
- Record saved in database

#### 3.2 - Insert Second Version (Same source_id)

**Request:**
```bash
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "versioning_test",
    "source_id": "item_1",
    "content": {"version": "v2", "data": "second version"}
  }'
```

**Expected:**
- `success: true`
- `version: 2` (auto-incremented)
- Both records exist in database

#### 3.3 - Verify Database Records

**SQL Query (run in Supabase SQL Editor):**
```sql
SELECT id, source, source_id, version, content, created_at
FROM ingested_results
WHERE source = 'versioning_test' AND source_id = 'item_1'
ORDER BY version ASC;
```

**Expected Results:**
- 2 rows returned
- Row 1: version = 1
- Row 2: version = 2
- Both rows have different `id` and `created_at`
- Content differs between versions

### Test 4: File Upload

#### 4.1 - Upload with File Attachment

**Preparation:**
```bash
# Create a test PDF file
echo "Test PDF content" > /tmp/test_report.pdf

# Or use an existing PDF
```

**Request:**
```bash
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -F "source=file_upload_test" \
  -F "source_id=report_1" \
  -F 'content={"title":"Test Report","summary":"This is a test"}' \
  -F "metadata={}" \
  -F "files=@/tmp/test_report.pdf"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "version": 1,
    "created_at": "2025-12-07T20:00:00Z",
    "file_urls": [
      "https://your-project.supabase.co/storage/v1/object/public/documents/..."
    ]
  }
}
```

**Verification:**
1. Check database record has `metadata.files` array with URL
2. Access the file URL in browser (may need signed URL if bucket is private)
3. Verify file is in Supabase Storage > documents bucket

### Test 5: Security Policies

#### 5.1 - Verify Public Cannot Insert

**Test with anon client (in browser console):**
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'your_supabase_url',
  'your_anon_key'  // Using anon key, not service role
);

// Try to insert - should fail
const { data, error } = await supabase
  .from('ingested_results')
  .insert({
    source: 'public_test',
    source_id: 'test_1',
    content: { test: 'should fail' },
    metadata: {}
  });

console.log('Error:', error);
// Expected: Permission denied error
```

#### 5.2 - Verify Public Can Read

**Test with anon client:**
```javascript
// Try to read - should succeed
const { data, error } = await supabase
  .from('ingested_results')
  .select('*')
  .eq('deleted', false)
  .limit(5);

console.log('Data:', data);
console.log('Error:', error);
// Expected: data array with records, no error
```

### Test 6: Token Expiration

#### 6.1 - Test Token Expiry (1 hour)

**Manual Test:**
1. Get a valid token
2. Wait 1 hour and 1 minute
3. Try to use the token
4. Should receive "Invalid or expired token" error

**Accelerated Test (for development):**
Temporarily modify `src/server/admin-auth.ts`:
```typescript
const TOKEN_EXPIRY = '5s'; // Change from '1h' to '5s'
```

Then:
```bash
# Get token
TOKEN=$(curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_password"}' | jq -r .token)

# Wait 6 seconds
sleep 6

# Try to use expired token
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source":"test","source_id":"1","content":{}}'
```

**Expected:** "Invalid or expired token" error

### Test 7: Storage Bucket Configuration

#### 7.1 - Verify Buckets Exist

**SQL Query:**
```sql
SELECT name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name IN ('documents', 'artifacts');
```

**Expected:**
- 2 rows (documents and artifacts)
- `public = false`
- `file_size_limit` set appropriately

#### 7.2 - Test File Size Limit

**Request (should fail for >50MB):**
```bash
# Create a 51MB file
dd if=/dev/zero of=/tmp/large_file.pdf bs=1M count=51

# Try to upload
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -F "source=size_test" \
  -F "source_id=large_1" \
  -F "content={}" \
  -F "files=@/tmp/large_file.pdf"
```

**Expected:** Error about file size exceeding limit

## Automated Testing (Optional)

To set up automated tests:

### Option 1: Vitest (Recommended for Vite)

```bash
npm install --save-dev vitest
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
});
```

### Option 2: Jest

```bash
npm install --save-dev jest @types/jest ts-jest
npx ts-jest config:init
```

### Sample Test File

Create `test/admin-auth.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { adminLogin, verifyAdminToken } from '../src/server/admin-auth';

// Set test environment
process.env.ADMIN_PASSWORD = 'test_pass_123';
process.env.APP_JWT_SECRET = 'test_secret_key';

describe('Admin Authentication', () => {
  it('should reject invalid password', async () => {
    const result = await adminLogin('wrong');
    expect(result.success).toBe(false);
  });

  it('should accept valid password', async () => {
    const result = await adminLogin('test_pass_123');
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
  });

  it('should generate valid JWT', async () => {
    const { token } = await adminLogin('test_pass_123');
    const payload = verifyAdminToken(token!);
    expect(payload?.role).toBe('admin');
  });
});
```

Run tests:
```bash
npm test
```

## Integration Test Checklist

Use this checklist to verify full system functionality:

- [ ] Admin can login with correct password
- [ ] Login fails with incorrect password
- [ ] JWT token is properly formatted
- [ ] Token expires after 1 hour
- [ ] Ingestion fails without token
- [ ] Ingestion fails with invalid token
- [ ] Ingestion succeeds with valid token
- [ ] First insert creates version 1
- [ ] Second insert with same source_id creates version 2
- [ ] Both versions exist in database (append-only)
- [ ] Files upload successfully to documents bucket
- [ ] File URLs are included in metadata
- [ ] Storage buckets exist (documents, artifacts)
- [ ] Buckets are private (not publicly accessible)
- [ ] Public (anon) cannot INSERT into ingested_results
- [ ] Public (anon) CAN read non-deleted records
- [ ] File size limits are enforced
- [ ] MIME type restrictions work (if configured)

## Troubleshooting Test Failures

### "Connection refused" errors
- Ensure your API server is running
- Check the port in your requests matches the server

### "Missing Authorization header" even with token
- Verify the header is named `Authorization` (capital A)
- Format must be: `Authorization: Bearer <token>`

### "Invalid token" with valid token
- Check `APP_JWT_SECRET` matches between login and verification
- Ensure token hasn't expired
- Verify token isn't corrupted (no extra spaces)

### Version not incrementing
- Verify the database trigger was created
- Check source and source_id match exactly
- Review trigger logs in Supabase Dashboard

### File upload fails
- Verify buckets were created: `npm run create-buckets`
- Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Ensure file size is within limits

### Public can INSERT (security issue!)
- Re-run the migration SQL
- Verify RLS is enabled on table
- Check that INSERT was revoked from anon/authenticated roles

## Continuous Testing

For ongoing development:

1. **Before each deployment:**
   - Run full integration test checklist
   - Verify environment variables are set
   - Check database migration status

2. **Weekly:**
   - Test token expiration behavior
   - Verify file uploads work
   - Check version incrementing

3. **After any security-related changes:**
   - Test RLS policies
   - Verify JWT signing
   - Check environment variable loading

---

**Last Updated:** 2025-12-07  
**Version:** 1.0.0
