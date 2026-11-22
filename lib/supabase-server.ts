// Server Supabase client for API routes. Uses the service role key when set,
// otherwise the anon key (fine while RLS is off, see supabase/schema.sql).
import { createClient } from "@supabase/supabase-js";
import type { Lead } from "./types";

export function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getLead(id: string): Promise<Lead | null> {
  const { data, error } = await serverSupabase()
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Lead) ?? null;
}

export async function updateLead(
  id: string,
  fields: Partial<Lead>,
): Promise<Lead> {
  const { data, error } = await serverSupabase()
    .from("leads")
    .update(fields)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Lead;
}
