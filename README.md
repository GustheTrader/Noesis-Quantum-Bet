<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Noesis Quantum Bet

QuantumEdge v.2 - Advanced sports betting analytics platform with AI-powered predictions and admin-controlled data ingestion.

View your app in AI Studio: https://ai.studio/apps/drive/1f-bISwAwzQZxk5zrw4wK1k3NapGC73n1

## Features

- 📊 Real-time betting performance analytics
- 🤖 AI-powered bet analysis using Google Gemini
- 📈 Interactive charts and ROI tracking
- 🔐 Secure admin-only data ingestion system
- 📁 Document storage with version control
- 🎯 Kelly Criterion calculator for optimal bet sizing

## Quick Start

**Prerequisites:**  Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

## Admin Ingestion System

The application includes a secure, admin-only ingestion system for managing betting data. Key features:

- 🔐 **JWT-based authentication** - Secure token-based admin access
- 📝 **Append-only storage** - Complete audit trail with versioning
- 📁 **File management** - Integrated PDF and Markdown storage
- 🛡️ **Row-level security** - Database-level access control

### Admin Setup

See detailed documentation:
- **[Admin System Overview](docs/ADMIN_SYSTEM_OVERVIEW.md)** - Architecture and concepts
- **[Admin Documentation](docs/ADMIN.md)** - Setup guide and API reference

Quick setup:
```bash
# 1. Configure environment (see .env.example)
cp .env.example .env

# 2. Run database migration (in Supabase SQL Editor)
# Execute: supabase/migrations/20251207_create_ingested_results_and_policies.sql

# 3. Create storage buckets
npm run create-buckets

# 4. Test admin login
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_password"}'
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Admin Authentication
ADMIN_PASSWORD=<strong_password>

# Supabase Configuration
SUPABASE_URL=<your_project_url>
SUPABASE_ANON_KEY=<public_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# JWT Secret
APP_JWT_SECRET=<random_32+_char_secret>

# Gemini AI
API_KEY=<gemini_api_key>
```

⚠️ **Security**: Never commit `.env` to source control. Use strong, unique values in production.

## Project Structure

```
├── components/          # React components
├── pages/              # Application pages
├── lib/                # Core libraries
├── src/
│   ├── api/           # API handlers (ingestion)
│   ├── lib/           # Utilities (storage)
│   └── server/        # Server-side logic (auth)
├── scripts/           # Setup scripts
├── supabase/          # Database migrations
├── test/              # Test files
└── docs/              # Documentation
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Create storage buckets
npm run create-buckets
```

## Security

This application implements multiple security layers:

- **Environment-based secrets** - No hardcoded credentials
- **JWT authentication** - Short-lived tokens (1 hour)
- **Row-level security (RLS)** - Database-level access control
- **Service role isolation** - Admin operations server-side only
- **Private storage buckets** - Files require signed URLs

See [Security Checklist](docs/ADMIN_SYSTEM_OVERVIEW.md#security-checklist) for production deployment.

## Documentation

- [Admin System Overview](docs/ADMIN_SYSTEM_OVERVIEW.md) - Architecture and design
- [Admin Guide](docs/ADMIN.md) - Detailed setup and API reference
- [Example Endpoints](src/server/example-endpoints.ts) - Integration examples

## License

Private - All rights reserved

## Support

For issues or questions about the admin system, see the [Troubleshooting Guide](docs/ADMIN.md#troubleshooting).
   `npm run dev`

## Database Setup

This application uses Supabase for data persistence with an **append-only, versioned ingestion system** to preserve all historical data.

### Initial Setup

1. **Run the migration**: Execute the SQL migration in your Supabase dashboard:
   - Open Supabase SQL Editor
   - Copy contents from `supabase/migrations/20251207_create_ingested_results.sql`
   - Run the migration to create the `ingested_results` table

2. **Verify setup**: Check that the table was created:
   ```sql
   SELECT * FROM ingested_results LIMIT 1;
   ```

### Ingestion System

The app uses an **append-only storage model** that:
- ✅ Never overwrites existing data
- ✅ Preserves complete version history
- ✅ Enables time-travel queries
- ✅ Prevents data loss during updates

**Documentation**: See [docs/INGESTION.md](docs/INGESTION.md) for detailed information about:
- Architecture and design
- Usage examples
- Migration from legacy tables
- Query patterns
- Security and permissions

**Tests**: See [test/ingestion.test.ts](test/ingestion.test.ts) for test examples demonstrating append-only behavior.
