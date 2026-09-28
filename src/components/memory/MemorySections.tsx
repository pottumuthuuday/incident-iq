import type { MemoryEntry, SimilarIncident } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { Badge, DemoBadge, NotConnectedBadge } from "@/components/ui/Badge";
import { SectionTitle } from "@/components/ui/Card";

/**
 * Sections for surfaces powered by AI analysis and Hindsight recall.
 * `source` controls the honesty marker: "demo" shows the DEMO DATA badge,
 * "live" shows a LIVE ANALYSIS badge (FastAPI agent over real Hindsight recall).
 */

function SourceBadge({ source }: { source: "demo" | "live" }) {
  if (source === "live") {
    return (
      <Badge className="border border-emerald-500/40 bg-emerald-500/10 uppercase text-emerald-300">
        Live analysis
      </Badge>
    );
  }
  return <DemoBadge />;
}

export function SimilarIncidentsSection({
  incidents,
  source = "demo",
}: {
  incidents: SimilarIncident[];
  source?: "demo" | "live";
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <SectionTitle>Similar incidents · recalled history</SectionTitle>
        <SourceBadge source={source} />
      </div>
      {incidents.length === 0 ? (
        <p className="text-sm text-[#8b99b5]">
          No similar incidents found yet — Hindsight recall is not connected.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {incidents.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-[#1e2a44] bg-[#0e1526] p-3.5 transition-colors hover:border-sky-500/30"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-100">
                  {s.id} · {s.title}
                </p>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-300">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" opacity="0.25" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  {s.similarity}% match
                </span>
              </div>
              <p className="mt-1 text-xs text-[#8b99b5]">
                {s.service} · {formatRelativeTime(s.occurredAt)}
              </p>
              <dl className="mt-2.5 grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-md bg-[#111a2e] p-2.5">
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">Root cause</dt>
                  <dd className="mt-0.5 text-slate-300">{s.rootCause}</dd>
                </div>
                <div className="rounded-md bg-[#111a2e] p-2.5">
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">Resolution</dt>
                  <dd className="mt-0.5 text-slate-300">{s.resolution}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RootCauseSection({
  hypotheses,
  source = "demo",
}: {
  hypotheses: { id: string; statement: string; confidence: number; evidence: string[] }[];
  source?: "demo" | "live";
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <SectionTitle>Root cause · ranked hypotheses</SectionTitle>
        <SourceBadge source={source} />
      </div>
      {hypotheses.length === 0 ? (
        <p className="text-sm text-[#8b99b5]">
          Analysis pending — the AI analysis backend will populate hypotheses here.
        </p>
      ) : (
        <ul className="space-y-3">
          {hypotheses.map((h) => (
            <li key={h.id} className="rounded-lg border border-[#1e2a44] bg-[#0e1526] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-100">{h.statement}</p>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    h.confidence >= 70
                      ? "bg-emerald-500/15 text-emerald-300"
                      : h.confidence >= 40
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-slate-500/15 text-slate-400"
                  }`}
                >
                  {h.confidence}%
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#1e2a44]">
                <div
                  className={`h-full rounded-full ${
                    h.confidence >= 70
                      ? "bg-emerald-400"
                      : h.confidence >= 40
                        ? "bg-amber-400"
                        : "bg-slate-500"
                  }`}
                  style={{ width: `${h.confidence}%` }}
                />
              </div>
              <ul className="mt-2.5 space-y-1">
                {h.evidence.map((ev, i) => (
                  <li key={i} className="flex gap-2 text-xs text-[#8b99b5]">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-400/70" />
                    {ev}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HindsightPendingPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[#2a3a5c] bg-[#0e1526]/60 p-4">
      <div className="mb-2 flex items-center gap-2">
        <NotConnectedBadge />
        <span className="text-xs font-medium text-slate-400">{title}</span>
      </div>
      <p className="text-xs leading-relaxed text-[#8b99b5]">{description}</p>
    </div>
  );
}

export function MemoryEntryRow({ entry }: { entry: MemoryEntry }) {
  const kindStyles: Record<MemoryEntry["kind"], string> = {
    incident: "bg-sky-500/10 text-sky-300",
    "root-cause": "bg-red-500/10 text-red-300",
    resolution: "bg-emerald-500/10 text-emerald-300",
    runbook: "bg-amber-500/10 text-amber-300",
    "post-mortem": "bg-violet-500/10 text-violet-300",
  };
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#1e2a44] bg-[#0e1526] p-3.5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${kindStyles[entry.kind]}`}
          >
            {entry.kind.replace("-", " ")}
          </span>
          <p className="truncate text-sm font-medium text-slate-100">{entry.title}</p>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[#8b99b5]">{entry.summary}</p>
        <p className="mt-1.5 text-[11px] text-slate-500">
          {entry.service} · retained {formatRelativeTime(entry.retainedAt)} · recalled{" "}
          {entry.recallCount}×
        </p>
      </div>
      <div className="shrink-0 sm:text-right">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Relevance
        </p>
        <p className="text-lg font-semibold text-sky-300">{entry.relevance}%</p>
      </div>
    </div>
  );
}
