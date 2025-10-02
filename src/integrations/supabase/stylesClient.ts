import { createClient } from '@supabase/supabase-js';

// Dedicated client for styles/clips feature using environment variables copied from audio-to-clip-maker-main
const STYLES_SUPABASE_URL = (import.meta as any)?.env?.VITE_SUPABASE_URL;
const STYLES_SUPABASE_KEY = (import.meta as any)?.env?.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!STYLES_SUPABASE_URL || !STYLES_SUPABASE_KEY) {
  // Fall back to the main client values only if env is missing
  console.warn('[stylesClient] VITE_SUPABASE_URL/KEY not set. Falling back to main client config.');
}

export const stylesSupabase = createClient(
  STYLES_SUPABASE_URL || "https://baffhoalkllpeugluyon.supabase.co",
  STYLES_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZmZob2Fsa2xscGV1Z2x1eW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NzQ1MTAsImV4cCI6MjA2NDM1MDUxMH0.j0ZPJKInaTvK3BYXE4Tp_Vf3pchbElN9P5EvMhuiqF4"
);
