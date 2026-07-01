import { createClient } from "@supabase/supabase-js";

// Fall back to a harmless placeholder so the app can be built/prerendered
// without env vars present. Real credentials are injected at runtime (and,
// for NEXT_PUBLIC_* vars, inlined at build time) in configured environments.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && typeof window !== "undefined") {
  console.warn(
    "NEXT_PUBLIC_SUPABASE_URL is not set — Supabase requests will fail until it is configured."
  );
}

// Public client for non-auth database queries (e.g., data_centers, epa_facilities)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
