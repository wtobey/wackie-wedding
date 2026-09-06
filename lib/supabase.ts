import { createClient } from "@supabase/supabase-js";

// Client-side Supabase. Requires the NEXT_PUBLIC_ prefix so the values are inlined
// into the browser bundle. When unset, `supabase` is null and every consumer falls
// back to generated/static content (the app stays fully usable without a backend).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not configured. Using fallback content.");
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const STORAGE_BUCKET = "polaroids";
