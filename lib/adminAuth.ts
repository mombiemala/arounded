import { createClient } from "@supabase/supabase-js";

export function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export function bearerToken(request: Request): string {
  return (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

// Resolve the caller and confirm they're an admin. Admin = their email is in the
// ADMIN_EMAILS env allowlist (the easy bootstrap for the first admin) OR their
// user_settings.is_admin flag is true. Returns null for anyone else.
export async function requireAdmin(
  token: string
): Promise<{ userId: string; email: string } | null> {
  if (!token) return null;
  const admin = serviceClient();
  const { data, error } = await admin.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return null;

  const email = (user.email || "").toLowerCase();
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (email && allow.includes(email)) return { userId: user.id, email };

  const { data: s } = await admin
    .from("user_settings")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();
  if (s?.is_admin === true) return { userId: user.id, email };

  return null;
}
