import { createClient } from "@supabase/supabase-js";
import { verifyUnsubToken } from "@/lib/alertToken";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function page(message: string): Response {
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Arounded alerts</title></head>
  <body style="margin:0;background:#000;color:#fff;font-family:-apple-system,Segoe UI,Roboto,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
    <div style="max-width:420px;padding:32px;text-align:center;">
      <div style="font-size:20px;font-weight:700;margin-bottom:8px;">Arounded</div>
      <p style="opacity:.85;line-height:1.6;">${message}</p>
      <a href="/" style="display:inline-block;margin-top:12px;color:#33c4d4;">Back to Arounded</a>
    </div>
  </body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const userId = verifyUnsubToken(token);
  if (!userId) {
    return page("That unsubscribe link isn't valid. You can manage email alerts from the app.");
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: userId, email_alerts: false, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) throw error;
    return page("You're unsubscribed from email alerts. You'll still see notifications in the app, and you can turn email back on anytime.");
  } catch {
    return page("Something went wrong turning off email alerts. Please try again from the app.");
  }
}
