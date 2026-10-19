import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

// Canonical project reference and URL for PrimePrep Supabase project
export const SUPABASE_PROJECT_REF = 'cffimwiaxacbibrndzio';
export const SUPABASE_DEFAULT_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || SUPABASE_DEFAULT_URL).trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

const effectiveKey = supabaseServiceKey || supabaseAnonKey;

let supabaseClient = null;

if (effectiveKey) {
  try {
    supabaseClient = createClient(supabaseUrl, effectiveKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log(`[Supabase Config] Initialized @supabase/supabase-js client for ${supabaseUrl} (key type: ${supabaseServiceKey ? 'service_role' : 'anon'})`);
  } catch (err) {
    console.warn(`[Supabase Config Warning] Could not initialize Supabase client: ${err.message}`);
  }
} else {
  console.log(`[Supabase Config] Supabase URL configured (${supabaseUrl}). Direct PostgreSQL GoTrue integration active.`);
}

export const getSupabaseClient = () => supabaseClient;
export const getSupabaseUrl = () => supabaseUrl;
export const hasSupabaseServiceKey = () => Boolean(supabaseServiceKey);
