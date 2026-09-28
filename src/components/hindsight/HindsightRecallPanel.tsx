"use client";

import { useState } from "react";
import { SectionTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/**
 * Interactive client panel for the Hindsight Memory page.
 * Runs REAL recall against the incidentiq bank via the server route.
 * Distinct states: results / no memories / connection failed / not configured.
 */

interface RecalledIncident {
  memoryId: string;
  text: string;
  relevance: number;
  incidentId: string | null;
  service: string | null;
  severity: string | null;
  runbook: string | null;
  rootCause: string | null;
  resolution: string | null;
  outcome: string | null;
  resolutionMinutes: number | null;
  occurredStart: string | null;
  context: string | null;
}

const SUGGESTED_QUERIES = [
  "database connection timeout on Payment API",
  "JWT key rotation auth failures",
  "worker OOM memory leak",
  "Redis max clients reached",
];

export function HindsightRecallPanel() {
  const [query, setQuery] = useState(SUGGESTED_QUERIES[0]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<
    | { kind: "idle" }
    | { kind: "ok"; results: RecalledIncident[] }
    | { kind: "empty"; message: string }
    | { kind: "not-configured"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function runRecall(q: string) {
    setLoading(true);
    setPhase({ kind: "idle" });
    try {
      const res = await fetch("/api/hindsight/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: q,
          service: "unknown",
          severity: "unknown",
          errorMessage: q,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const err = payload?.error;
        if (err?.kind === "not-configured") {
          setPhase({ kind: "not-configured", message: err.message });
        } else {
          setPhase({ kind: "error", message: err?.message ?? `HTTP ${res.status}` });
        }
        return;
      }
      if (payload.data.state === "ok") {
        setPhase({ kind: "ok", results: payload.data.results });
      } else {
        setPhase({ kind: "empty", message: payload.data.message ?? "No memories found." });
      }
    } catch (err) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Recall request failed",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) runRecall(query.trim());
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Query memory: describe an incident, error or service…"
          className="min-w-[240px] flex-1 rounded-lg border border-[#26344f] bg-[#0e1526] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-500/60 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-50"
        >
          {loading ? "Recalling…" : "🧠 Recall"}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUERIES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              setQuery(q);
              runRecall(q);
            }}
            className="rounded-full bg-[#0e1526] px-3 py-1 text-[11px] text-slate-400 ring-1 ring-[#1e2a44] transition-colors hover:text-sky-300"
          >
            {q}
          </button>
        ))}
      </div>

      {phase.kind === "idle" && !loading ? (
        <p className="text-sm text-[#8b99b5]">
          Run a query to search the real Hindsight memory bank.
        </p>
      ) : null}
      {loading ? <p className="text-sm text-[#8b99b5]">Querying Hindsight memory…</p> : null}

      {phase.kind === "not-configured" ? (
        <p className="rounded-lg border border-dashed border-[#2a3a5c] bg-[#0e1526]/60 px-3 py-2 text-xs leading-relaxed text-[#8b99b5]">
          <strong className="text-slate-300">Hindsight not configured.</strong> {phase.message}
        </p>
      ) : null}
      {phase.kind === "error" ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-300">
          <strong>Hindsight connection failed.</strong> {phase.message}
        </p>
      ) : null}
      {phase.kind === "empty" ? (
        <p className="rounded-lg border border-dashed border-[#2a3a5c] bg-[#0e1526]/60 px-3 py-2 text-xs leading-relaxed text-[#8b99b5]">
          {phase.message}
        </p>
      ) : null}

      {phase.kind === "ok" ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Memories found · {phase.results.length}</SectionTitle>
            <Badge className="bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30">
              Live Hindsight recall
            </Badge>
          </div>
          <ul className="space-y-2.5">
            {phase.results.map((r) => (
              <li key={r.memoryId} className="rounded-lg border border-[#1e2a44] bg-[#0e1526] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">
                    {r.incidentId ?? "Memory"} · {r.service ?? "unknown service"}
                    {r.severity ? ` · ${r.severity}` : ""}
                  </p>
                  <span className="text-[11px] font-semibold text-sky-300">
                    {r.relevance}% match
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                  {r.text}
                </p>
                {r.context ? (
                  <p className="mt-1 font-mono text-[10px] text-slate-500">context: {r.context}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
