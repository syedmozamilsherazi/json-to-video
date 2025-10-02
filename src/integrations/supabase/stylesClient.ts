import { createClient } from '@supabase/supabase-js';

// Dedicated client for styles/clips feature using environment variables copied from audio-to-clip-maker-main
const ENV_URL = (import.meta as any)?.env?.VITE_SUPABASE_URL;
const ENV_KEY = (import.meta as any)?.env?.VITE_SUPABASE_PUBLISHABLE_KEY;

// Safe fallbacks to audio-to-clip-maker project so the app never crashes blank
const FALLBACK_URL = "https://qcmueipwesracbrmwcfw.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjbXVlaXB3ZXNyYWNicm13Y2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1ODQ2NjksImV4cCI6MjA3MzE2MDY2OX0.zeUgEGKvSeLzGAI6FwvupMjPMo2KYAU1P0VeK7T6zpg";

const STYLES_SUPABASE_URL = ENV_URL || FALLBACK_URL;
const STYLES_SUPABASE_KEY = ENV_KEY || FALLBACK_KEY;

if (!ENV_URL || !ENV_KEY) {
  console.warn('[stylesClient] Using fallback Supabase project. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to override.');
}

export const stylesSupabase = createClient(
  STYLES_SUPABASE_URL,
  STYLES_SUPABASE_KEY
);
