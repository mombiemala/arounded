import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-sm text-ink-soft">
        <div className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <circle cx="13" cy="13" r="11.5" stroke="var(--color-brand)" strokeWidth="1.4" opacity="0.4" />
            <circle cx="13" cy="13" r="7.3" stroke="var(--color-brand)" strokeWidth="1.4" opacity="0.7" />
            <circle cx="13" cy="13" r="3" fill="var(--color-brand)" />
          </svg>
          <span>Arounded — see what&apos;s moving in around you.</span>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/about" className="hover:text-ink transition-colors">About</Link>
          <Link href="/methodology" className="hover:text-ink transition-colors">How it works</Link>
          <Link href="/changes" className="hover:text-ink transition-colors">What&apos;s changed</Link>
          <Link href="/privacy" className="hover:text-ink transition-colors">Privacy</Link>
          <Link href="/login" className="hover:text-ink transition-colors">Sign in</Link>
        </nav>
      </div>
    </footer>
  );
}
