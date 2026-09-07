import Link from "next/link";

interface SourceLinkProps {
  href: string;
  label: string;
}

export default function SourceLink({ href, label }: SourceLinkProps) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (opens in a new tab)`}
      className="underline underline-offset-2 decoration-line hover:decoration-ink-faint transition-colors hover:opacity-90"
    >
      {label}
    </Link>
  );
}