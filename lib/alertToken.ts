import crypto from "crypto";

// Signs/verifies a per-user unsubscribe token so the one-click unsubscribe link
// in emails works without the user being signed in. The service-role key is a
// server-only secret and always present where these routes run.
function secret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "arounded-fallback-secret";
}

function sign(userId: string): string {
  return crypto.createHmac("sha256", secret()).update(userId).digest("hex").slice(0, 32);
}

export function makeUnsubToken(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

export function verifyUnsubToken(token: string): string | null {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const userId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(userId);
  if (sig.length !== expected.length) return null;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? userId : null;
  } catch {
    return null;
  }
}
