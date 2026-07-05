"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseBrowser";

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createBrowserClient();

  useEffect(() => {
    const handleCallback = async () => {
      const error = params.get("error");
      if (error) {
        router.replace("/login?error=auth_failed");
        return;
      }

      // Exchange the code for a session
      const { data, error: exchangeError } = await supabase.auth.getSession();
      
      if (exchangeError) {
        router.replace("/login?error=auth_failed");
        return;
      }

      // If we have a session, redirect to map
      if (data?.session) {
        router.replace("/map");
      }
    };

    handleCallback();
  }, [params, router, supabase]);

  return (
    <div className="min-h-screen bg-ground text-white flex items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold mb-3">Signing you in</h1>
        <p className="text-sm opacity-75 leading-relaxed">
          We're setting up your session. This usually takes just a moment.
        </p>

        <div className="mt-6 flex justify-center">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-ground text-white flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-semibold mb-3">Signing you in</h1>
          <p className="text-sm opacity-75 leading-relaxed">
            We're setting up your session. This usually takes just a moment.
          </p>
          <div className="mt-6 flex justify-center">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
