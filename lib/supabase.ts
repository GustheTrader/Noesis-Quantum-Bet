
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://rrwvhjcdgkwixxnqcfom.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyd3ZoamNkZ2t3aXh4bnFjZm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MzQ1NDMsImV4cCI6MjA4MDAxMDU0M30.f1aGXUrNdQeVhrL-OoPKTJ7XOqb0N8PVo6dSEdhnHG4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* 
================================================================
MARKETING EMAIL SETUP: COPY AND PASTE INTO SUPABASE SQL EDITOR
THEN CLICK "RUN" TO FIX THE "TABLE NOT FOUND" ERROR
================================================================

-- 1. Create the Leads Table
create table if not exists visitor_emails (
  id uuid default uuid_generate_v4() primary key,
  email text not null,
  captured_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Security
alter table visitor_emails enable row level security;

-- 3. Create Policy: Allow Public to INSERT (Save Email)
-- We drop first to avoid errors if re-running
drop policy if exists "Public Insert Emails" on visitor_emails;
create policy "Public Insert Emails" on visitor_emails for insert with check (true);

-- 4. Create Policy: Only Admin/Auth can READ (View List)
drop policy if exists "Admin View Emails" on visitor_emails;
create policy "Admin View Emails" on visitor_emails for select using (auth.role() = 'authenticated');

-- 5. (Optional) Run this if you want to verify it works manually
-- insert into visitor_emails (email) values ('test@example.com');

*/
