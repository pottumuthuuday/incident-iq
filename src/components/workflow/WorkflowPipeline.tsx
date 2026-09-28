import Link from "next/link";

const steps = [
  { label: "New Incident", href: "/incidents/new" },
  { label: "Analyze", href: null },
  { label: "Recall", href: "/memory" },
  { label: "Recommend", href: null },
  { label: "Resolve", href: null },
  { label: "Post-Mortem", href: "/post-mortems" },
  { label: "Retain to Hindsight", href: "/memory" },
  { label: "Learn", href: null },
];

/**
 * Visualizes the product workflow:
 * NEW INCIDENT → ANALYZE → RECALL → RECOMMEND → RESOLVE → POST-MORTEM →
 * RETAIN TO HINDSIGHT → LEARN
 */
export function WorkflowPipeline() {
  return (
    <nav
      aria-label="IncidentIQ workflow"
      className="overflow-x-auto rounded-xl border border-[#1e2a44] bg-[#0e1526] px-4 py-3"
    >
      <ol className="flex min-w-max items-center gap-1.5">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-1.5">
            {i > 0 ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-600" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            ) : null}
            {s.href ? (
              <Link
                href={s.href}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-[#16203a] hover:text-sky-300"
              >
                {s.label}
              </Link>
            ) : (
              <span className="rounded-md px-2 py-1 text-[11px] text-slate-500">{s.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
