// Browser Supabase client (anon key). Used by the dashboard, lead and talk pages.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

// Fallback values keep the module importable when env is missing; pages show
// a setup banner instead of crashing.
export const supabase = createClient(
  url || "http://localhost:54321",
  anonKey || "missing-anon-key",
);
