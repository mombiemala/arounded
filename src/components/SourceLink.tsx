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
      className="underline underline-offset-2 decoration-white/20 hover:decoration-white/50 transition-colors hover:opacity-90"
    >
      {label}
    </Link>
  );
}