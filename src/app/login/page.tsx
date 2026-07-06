"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import { Rings, Glow } from "@/src/components/Decor";

const ENABLE_GOOGLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);

  const supabase = createBrowserClient();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setMessage({
        type: "success",
        text:
          "Magic link sent. Check your inbox (and spam/promotions). Open it on this device to finish signing in.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Couldn’t send the magic link. Try again in a moment.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      // Redirect handled by OAuth flow
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Google sign-in isn’t available right now. Use email instead.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ground text-white flex items-center justify-center px-4 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <Glow className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full" opacity={0.08} />
        <Rings className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px]" opacity={0.07} />
      </div>
      <div className="w-full max-w-md relative">
        {/* Top nav */}
        <nav className="border-b border-white/10 bg-ground/80 backdrop-blur-sm mb-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              Arounded
            </Link>
            <Link
              href="/map"
              className="text-sm text-white/80 hover:text-white transition-colors rounded-lg px-3 py-2 hover:bg-white/5"
            >
              Explore
            </Link>
          </div>
        </nav>

        <div className="rounded-2xl border border-white/10 p-8">
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-brand mb-3">
            Your places
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Sign in</h1>
          <p className="text-sm opacity-70 mb-6 leading-relaxed">
            The map is free — no account needed. Sign in only to save your places, see their
            history, and get alerts when something new is proposed nearby.
          </p>

          {message && (
            <div
              className={[
                "mb-6 p-4 rounded-lg border text-sm leading-relaxed",
                message.type === "success"
                  ? "bg-green-500/15 border-green-500/40 text-green-300"
                  : "bg-red-500/15 border-red-500/40 text-red-300",
              ].join(" ")}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-lg border border-white/20 bg-ground/50 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-brand text-brand-ink rounded-lg font-medium hover:bg-brand-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send magic link"}
            </button>

            <p className="text-xs opacity-60">
              Tip: If you don’t see it within a minute, check spam/promotions.
            </p>
          </form>

          {ENABLE_GOOGLE_AUTH && (
            <>
              <div className="my-6 flex items-center">
                <div className="flex-1 border-t border-white/10" />
                <span className="px-4 text-sm opacity-60">or</span>
                <div className="flex-1 border-t border-white/10" />
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full px-6 py-3 border border-white/20 rounded-lg font-medium hover:border-white/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue with Google
              </button>
            </>
          )}

          <p className="mt-6 text-xs opacity-60 text-center">
            By signing in, you agree to our{" "}
            <Link href="/privacy" className="underline hover:opacity-100">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <p className="mt-6 text-sm opacity-60 text-center">
          Don’t have an account? The magic link will create one for you.
        </p>
      </div>
    </div>
  );
}