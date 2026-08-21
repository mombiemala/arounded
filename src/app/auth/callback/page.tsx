"use client";

import { useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseBrowser";

function LoadingCard() {
  return (
    <div className="min-h-screen bg-ground text-white flex items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold mb-3">Signing you in</h1>
        <p className="text-sm opacity-75 leading-relaxed">
          We&apos;re setting up your session. This usually takes just a moment.
        </p>
        <div className="mt-6 flex justify-center">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  // Stable client instance so this effect doesn't re-run on every render.
  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    let done = false;
    const finish = (path: string) => {
      if (!done) {
        done = true;
        router.replace(path);
      }
    };

    const run = async () => {
      // The provider bounced back with an explicit error (e.g. access denied).
      if (params.get("error") || params.get("error_description")) {
        finish("/login?error=auth_failed");
        return;
      }

      // PKCE flow returns ?code=… — exchange it for a session.
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        finish(error ? "/login?error=auth_failed" : "/map");
        return;
      }

      // Implicit flow returns tokens in the URL hash; detectSessionInUrl parses
      // them during client init. Poll briefly for the resulting session.
      for (let i = 0; i < 12; i++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          finish("/map");
          return;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      finish("/login?error=auth_failed");
    };

    run();
  }, [params, router, supabase]);

  return <LoadingCard />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingCard />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
