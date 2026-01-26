"use client";

import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click + Escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowUserMenu(false);
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onKey);
    }

    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [showUserMenu]);

  const navLink = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={[
          "text-sm transition-colors rounded-lg px-3 py-2",
          active ? "bg-white/10 text-white" : "text-white/80 hover:text-white hover:bg-white/5",
        ].join(" ")}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Arounded
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {navLink("/map", "Explore")}
            {navLink("/methodology", "Methodology")}

            {/* Optional: add Privacy/Contact once those pages exist */}
            {/* {navLink("/privacy", "Privacy")} */}

            <div className="ml-2 sm:ml-3">
              {user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowUserMenu((v) => !v)}
                    className="text-sm rounded-lg px-3 py-2 text-white/80 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                    aria-haspopup="menu"
                    aria-expanded={showUserMenu}
                  >
                    <span className="hidden sm:inline max-w-[220px] truncate">
                      {user.email}
                    </span>
                    <span className="sm:hidden">Account</span>
                    <svg
                      className="w-4 h-4 opacity-80"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {showUserMenu && (
                    <div
                      className="absolute right-0 mt-2 w-56 border border-white/10 rounded-xl bg-black/95 backdrop-blur-sm shadow-lg overflow-hidden"
                      role="menu"
                    >
                      <div className="p-3 border-b border-white/10">
                        <p className="text-xs opacity-60">Signed in as</p>
                        <p className="text-sm truncate">{user.email}</p>
                      </div>

                      <Link
                        href="/map"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                        role="menuitem"
                      >
                        My places
                        <span className="ml-2 text-xs opacity-60">(saved)</span>
                      </Link>

                      <button
                        onClick={async () => {
                          await signOut();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                        role="menuitem"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="text-sm rounded-lg px-3 py-2 border border-white/15 hover:border-white/30 transition-colors text-white"
                  >
                    Sign in
                  </Link>
                  <span className="hidden md:inline text-xs text-white/50">
                    to save places
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}