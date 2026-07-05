// Accessible tooltip — shows on hover and on keyboard focus, and announces its
// content to screen readers via aria-label on the trigger. No JS/state needed.
export default function Tooltip({
  content,
  children,
  className = "",
}: {
  content: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`relative inline-flex group ${className}`}>
      <span
        tabIndex={0}
        aria-label={content}
        className="inline-flex items-center gap-1 cursor-help outline-none rounded"
      >
        {children}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-white/10 bg-[#0f1815] px-3 py-2 text-xs font-normal normal-case tracking-normal leading-relaxed text-white/90 shadow-lg opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0"
      >
        {content}
      </span>
    </span>
  );
}
