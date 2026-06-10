/**
 * supabaseClient.js — Single Supabase client instance for the whole app.
 * Reads from .env.local — no credentials are hard-coded.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = import.meta.env.VITE_PROJECT_URL;
const SUPABASE_ANON    = import.meta.env.VITE_PUBLISHABLE_KEY;

export const BUCKET    = import.meta.env.VITE_STORAGE_BUCKET ?? 'profiles';
export const TABLE     = 'player_profiles';

export const isSupabaseEnabled = !!(SUPABASE_URL && SUPABASE_ANON);

export const supabase = isSupabaseEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON)
  : null;

if (!isSupabaseEnabled) {
  console.info('[Scout AI] Supabase not configured — running in offline-only mode.');
}
