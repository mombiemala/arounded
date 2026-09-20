import { NextResponse } from "next/server";

// Shared guard for cron-only endpoints.
//
// When CRON_SECRET is set, a request must present it as either
//   Authorization: Bearer <secret>   (Vercel Cron sends this automatically), or
//   ?key=<secret>                     (handy for a manual trigger).
// When CRON_SECRET is unset the check is a no-op, so nothing breaks before the
// secret is configured — set the env var in Vercel to lock every cron down at once.
//
// Returns a 401 NextResponse to return early, or null when the request is allowed.
export function cronUnauthorized(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;

  const auth = request.headers.get("authorization");
  let key: string | null = null;
  try {
    key = new URL(request.url).searchParams.get("key");
  } catch {
    key = null;
  }

  if (auth === `Bearer ${secret}` || key === secret) return null;
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}
