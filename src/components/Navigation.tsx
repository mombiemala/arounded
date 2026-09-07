"use client";

import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import NotificationsBell from "@/src/components/NotificationsBell";

const NAV_LINKS: [string, string][] = [
  ["/map", "Map"],
  ["/decisions", "Decisions"],
  ["/near", "Look up an address"],
  ["/about", "About"],
];

export default function Navigation() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the account menu on outside click + Escape
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

  const toggleTheme = () => {
    const root = document.documentElement;
    const explicit = root.getAttribute("data-theme");
    const isDark = explicit
      ? explicit === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = isDark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("arounded-theme", next);
    } catch {}
  };

  const navLink = (href: string, label: string, block = false) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        onClick={() => setShowMobileMenu(false)}
        className={[
          "text-sm transition-colors rounded-lg px-3 py-2",
          block ? "block" : "",
          active ? "bg-brand/15 text-brand" : "text-ink-soft hover:text-ink hover:bg-hover",
        ].join(" ")}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="border-b border-line bg-ground/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-tight flex items-center gap-2.5"
          >
            <svg width="24" height="24" viewBox="0 0 26 26" fill="none" aria-hidden="true" className="shrink-0">
              <circle cx="13" cy="13" r="11.5" stroke="var(--color-brand)" strokeWidth="1.4" opacity="0.4" />
              <circle cx="13" cy="13" r="7.3" stroke="var(--color-brand)" strokeWidth="1.4" opacity="0.7" />
              <circle cx="13" cy="13" r="3" fill="var(--color-brand)" />
            </svg>
            Arounded
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-1 lg:gap-2">
              {NAV_LINKS.map(([href, label]) => (
                <span key={href}>{navLink(href, label)}</span>
              ))}
            </div>

            {user && <NotificationsBell />}

            <button
              onClick={toggleTheme}
              aria-label="Switch light or dark theme"
              className="rounded-lg p-2 text-ink-soft hover:text-ink hover:bg-hover transition-colors"
            >
              <svg className="theme-moon w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg className="theme-sun w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="4.5" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
              </svg>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setShowMobileMenu((v) => !v)}
              className="md:hidden text-ink-soft hover:text-ink rounded-lg p-2 hover:bg-hover transition-colors"
              aria-label="Menu"
              aria-expanded={showMobileMenu}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>

            <div className="ml-1 sm:ml-2">
              {user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowUserMenu((v) => !v)}
                    className="text-sm rounded-lg px-3 py-2 text-ink-soft hover:text-ink hover:bg-hover transition-colors flex items-center gap-2"
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
                      className="absolute right-0 mt-2 w-56 border border-line rounded-xl bg-ground/95 backdrop-blur-sm shadow-lg overflow-hidden"
                      role="menu"
                    >
                      <div className="p-3 border-b border-line">
                        <p className="text-xs opacity-60">Signed in as</p>
                        <p className="text-sm truncate">{user.email}</p>
                      </div>

                      <Link
                        href="/map"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-3 py-2 text-sm hover:bg-surface-2 transition-colors"
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
                        className="w-full text-left px-3 py-2 text-sm hover:bg-surface-2 transition-colors"
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
                    className="text-sm rounded-lg px-3 py-2 border border-line hover:border-ink-soft transition-colors text-ink"
                  >
                    Sign in
                  </Link>
                  <span className="hidden md:inline text-xs text-ink-faint">
                    to save places
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-line py-2" role="menu">
            {NAV_LINKS.map(([href, label]) => (
              <span key={href} className="block">
                {navLink(href, label, true)}
              </span>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}