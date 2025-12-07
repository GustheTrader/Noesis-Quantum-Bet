<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1f-bISwAwzQZxk5zrw4wK1k3NapGC73n1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
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
