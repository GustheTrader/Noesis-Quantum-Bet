# Admin System Quick Start

**5-Minute Setup Guide for the Admin Ingestion System**

## Step 1: Environment Setup (2 minutes)

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values (use a text editor)
nano .env
```

**Required Variables:**
```env
ADMIN_PASSWORD=your_strong_password_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
APP_JWT_SECRET=generate_with_openssl_rand_base64_32
API_KEY=your_gemini_api_key
```

💡 **Generate JWT Secret:**
```bash
openssl rand -base64 32
```

## Step 2: Database Setup (1 minute)

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20251207_create_ingested_results_and_policies.sql`
3. Paste and click **RUN**
4. Wait for success message

## Step 3: Create Storage Buckets (30 seconds)

```bash
npm run create-buckets
```

✅ You should see:
```
✅ Bucket created successfully
✅ All buckets created successfully!
```

## Step 4: Test the System (1.5 minutes)

### Test 1: Login

```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_password"}'
```

✅ **Success:** You get a JWT token in response

### Test 2: Ingest Data

```bash
# Save token from previous response
TOKEN="your_token_here"

curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "test",
    "source_id": "1",
    "content": {"test": "Hello World"}
  }'
```

✅ **Success:** You get back `{success: true, data: {...}}`

### Test 3: Verify in Database

Open Supabase Dashboard → Table Editor → `ingested_results`

✅ **Success:** You see your test record with version 1

## Common Commands

```bash
# Login and save token
TOKEN=$(curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_password"}' | jq -r .token)

# Ingest with saved token
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source":"pdf","source_id":"week-5","content":{...}}'

# Upload file
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -F "source=reports" \
  -F "source_id=week-5" \
  -F "content={}" \
  -F "files=@report.pdf"
```

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing Authorization header" | Add `-H "Authorization: Bearer $TOKEN"` |
| "Invalid token" | Token expired (1h) - login again |
| "Cannot find module" | Run `npm install` |
| "Bucket not found" | Run `npm run create-buckets` |
| "Permission denied" | Check service role key in .env |

## Architecture at a Glance

```
Client → API Server → Auth Middleware → Database
                   ↓
              Storage Buckets
```

- **Authentication:** JWT tokens (1 hour expiry)
- **Storage:** Append-only with versioning
- **Security:** RLS policies, environment secrets
- **Files:** Private buckets with signed URLs

## Next Steps

- 📖 [Full Admin Guide](./ADMIN.md) - Detailed documentation
- 🏗️ [System Overview](./ADMIN_SYSTEM_OVERVIEW.md) - Architecture
- 🧪 [Testing Guide](../test/TESTING_GUIDE.md) - Test procedures
- 💻 [Example Code](../src/server/example-endpoints.ts) - Integration examples

## Security Checklist

Before going to production:

- [ ] Change default password (`101010`)
- [ ] Generate strong JWT secret (32+ chars)
- [ ] Use HTTPS for API endpoints
- [ ] Verify .env is in .gitignore
- [ ] Test RLS policies work
- [ ] Set up monitoring/logging

---

**Need Help?** See [docs/ADMIN.md](./ADMIN.md) for troubleshooting.
