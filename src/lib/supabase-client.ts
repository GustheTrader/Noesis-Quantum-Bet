/**
 * Supabase Client Configuration
 * 
 * This module provides two Supabase clients:
 * 1. supabaseAnon - Public client using anon key (for frontend)
 * 2. supabaseServer - Service role client (for server-side admin operations)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rrwvhjcdgkwixxnqcfom.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyd3ZoamNkZ2t3aXh4bnFjZm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MzQ1NDMsImV4cCI6MjA4MDAxMDU0M30.f1aGXUrNdQeVhrL-OoPKTJ7XOqb0N8PVo6dSEdhnHG4';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Public/Anonymous client - used for frontend and public reads
export const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Service role client - used for server-side admin operations (bypasses RLS)
// This should ONLY be used on the server, never exposed to the client
let _supabaseServer: ReturnType<typeof createClient> | null = null;

export const getSupabaseServer = () => {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. This is required for admin operations.');
  }
  
  if (!_supabaseServer) {
    _supabaseServer = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  
  return _supabaseServer;
};

// Export URL and keys for use in other modules
export { SUPABASE_URL, SUPABASE_ANON_KEY };
