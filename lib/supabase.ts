
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://rrwvhjcdgkwixxnqcfom.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyd3ZoamNkZ2t3aXh4bnFjZm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MzQ1NDMsImV4cCI6MjA4MDAxMDU0M30.f1aGXUrNdQeVhrL-OoPKTJ7XOqb0N8PVo6dSEdhnHG4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* 
================================================================
CRITICAL: COPY AND PASTE THE SQL BELOW INTO SUPABASE SQL EDITOR
THEN CLICK "RUN" TO FIX THE COLUMN NAME & STORAGE PERMISSIONS
================================================================

-- 1. Create a Storage Bucket for Reports (if not exists)
insert into storage.buckets (id, name, public)
values ('reports', 'reports', true)
on conflict (id) do nothing;

-- 2. Allow Public Access to the Bucket (Read/Write)
-- We drop to ensure we don't have duplicate policies
drop policy if exists "Public Access Reports" on storage.objects;
create policy "Public Access Reports" on storage.objects 
for all using ( bucket_id = 'reports' ) with check ( bucket_id = 'reports' );

-- 3. Add fileUrl column to Weeks table
-- NOTE: We use quotes "fileUrl" to match the TypeScript object key exactly!
alter table weeks add column if not exists "fileUrl" text;

-- 4. Re-run Policy fixes just in case
drop policy if exists "Public Access" on weeks;
create policy "Public Access" on weeks for all using (true) with check (true);

*/
