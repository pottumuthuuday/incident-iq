"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardBody, SectionTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Incident } from "@/lib/types";

/**
 * 🧠 Hindsight Memory — investigation-time recall.
 *
 * Calls the server-side routes (which hold HINDSIGHT_API_KEY) and renders the
 * REAL recall results from the incidentiq memory bank. Distinguishes clearly
 * between:
 *   - memories found          → recall.state === "ok"
 *   - no memories found       → recall.state === "empty"
 *   - Hindsight unreachable   → HTTP error / network failure
 *   - HINDSIGHT_API_KEY unset → HTTP 503 kind=not-configured
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

type RecallState =
  | { phase: "loading" }
  | { phase: "ok"; results: RecalledIncident[] }
  | { phase: "empty"; message: string }
  | { phase: "not-configured"; message: string }
  | { phase: "error"; message: string };

type RecommendState =
  | { phase: "loading" }
  | { phase: "ok"; text: string }
  | { phase: "empty"; message: string }
  | { phase: "not-configured"; message: string }
  | { phase: "error"; message: string };

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const err = payload?.error;
    const message = err?.message ?? `Request failed (HTTP ${res.status})`;
    const e = new Error(message) as Error & { kind?: string };
    e.kind = err?.kind;
    throw e;
  }
  return payload.data as T;
}

export function HindsightInvestigation({ incident }: { incident: Incident }) {
  const [recall, setRecall] = useState<RecallState>({ phase: "loading" });
  const [recommendation, setRecommendation] = useState<RecommendState>({ phase: "loading" });
  const [recallLoaded, setRecallLoaded] = useState(false);

  const incidentInput = {
    title: incident.title,
    service: incident.service,
    severity: incident.severity,
    errorMessage: incident.errorMessage,
    description: incident.description,
  };

  useEffect(() => {
    let cancelled = false;

    // Recall similar incidents
    postJson<{ state: "ok" | "empty"; results?: RecalledIncident[]; message?: string }>(
      "/api/hindsight/recall",
      incidentInput
    )
      .then((data) => {
        if (cancelled) return;
        setRecallLoaded(true);
        if (data.state === "ok" && data.results) {
          setRecall({ phase: "ok", results: data.results });
        } else {
          setRecall({
            phase: "empty",
            message: data.message ?? "No memories found in Hindsight for this incident yet.",
          });
        }
      })
      .catch((err: Error & { kind?: string }) => {
        if (cancelled) return;
        setRecallLoaded(true);
        if (err.kind === "not-configured") {
          setRecall({ phase: "not-configured", message: err.message });
        } else {
          setRecall({ phase: "error", message: err.message });
        }
      });

    // Recommendation grounded in memory (Hindsight reflect)
    postJson<{ state: "ok" | "empty"; recommendation?: string; message?: string }>(
      "/api/hindsight/recommendation",
      incidentInput
    )
      .then((data) => {
        if (cancelled) return;
        if (data.state === "ok" && data.recommendation) {
          setRecommendation({ phase: "ok", text: data.recommendation });
        } else {
          setRecommendation({
            phase: "empty",
            message: data.message ?? "No recommendation could be generated from memory.",
          });
        }
      })
      .catch((err: Error & { kind?: string }) => {
        if (cancelled) return;
        if (err.kind === "not-configured") {
          setRecommendation({ phase: "not-configured", message: err.message });
        } else {
          setRecommendation({ phase: "error", message: err.message });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident.id]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {/* ---------------- 🧠 Hindsight Memory — real recall ---------------- */}
      <Card>
        <CardHeader
          title="🧠 Hindsight Memory"
          subtitle="Recalled from the incidentiq memory bank — real Hindsight Cloud data"
        />
        <CardBody>
          <RecallBody state={recall} loaded={recallLoaded} />
        </CardBody>
      </Card>

      {/* ---------------- Memory-grounded recommendation ---------------- */}
      <Card>
        <CardHeader
          title="AI recommendation · grounded in memory"
          subtitle="Generated by Hindsight reflect using retained incidents, causes, runbooks and lessons"
        />
        <CardBody>
          <RecommendBody state={recommendation} />
        </CardBody>
      </Card>
    </div>
  );
}

function StateLine({ tone, children }: { tone: "error" | "pending"; children: React.ReactNode }) {
  return (
    <p
      className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${
        tone === "error"
          ? "border-red-500/30 bg-red-500/10 text-red-300"
          : "border-dashed border-[#2a3a5c] bg-[#0e1526]/60 text-[#8b99b5]"
      }`}
    >
      {children}
    </p>
  );
}

function RecallBody({ state, loaded }: { state: RecallState; loaded: boolean }) {
  if (state.phase === "loading") {
    return (
      <p className="text-sm text-[#8b99b5]">
        {loaded ? "Refreshing recall…" : "Querying Hindsight memory…"}
      </p>
    );
  }
  if (state.phase === "not-configured") {
    return (
      <StateLine tone="pending">
        <strong className="text-slate-300">Hindsight not configured.</strong>{" "}
        {state.message} Memory recall and retention are disabled — no placeholder data is shown.
      </StateLine>
    );
  }
  if (state.phase === "error") {
    return (
      <StateLine tone="error">
        <strong>Hindsight connection failed.</strong> {state.message} Historical memories could not
        be retrieved — nothing is shown in their place.
      </StateLine>
    );
  }
  if (state.phase === "empty") {
    return <StateLine tone="pending">{state.message}</StateLine>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle>Historical incidents found · {state.results.length}</SectionTitle>
        <Badge className="bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30">
          Live Hindsight recall
        </Badge>
      </div>
      <ul className="space-y-2.5">
        {state.results.map((r) => (
          <li
            key={r.memoryId}
            className="rounded-lg border border-[#1e2a44] bg-[#0e1526] p-3.5 transition-colors hover:border-sky-500/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-100">
                {r.incidentId ?? "Memory"} · {r.service ?? "unknown service"}
                {r.severity ? ` · ${r.severity}` : ""}
              </p>
              <span className="text-[11px] font-semibold text-sky-300">{r.relevance}% match</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{r.text}</p>
            <dl className="mt-2.5 grid gap-2 text-xs sm:grid-cols-2">
              {r.rootCause ? (
                <div className="rounded-md bg-[#111a2e] p-2.5">
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">Root cause</dt>
                  <dd className="mt-0.5 text-slate-300">{r.rootCause}</dd>
                </div>
              ) : null}
              {r.resolution ? (
                <div className="rounded-md bg-[#111a2e] p-2.5">
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">Resolution</dt>
                  <dd className="mt-0.5 text-slate-300">{r.resolution}</dd>
                </div>
              ) : null}
              {r.runbook ? (
                <div className="rounded-md bg-[#111a2e] p-2.5">
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">Runbook</dt>
                  <dd className="mt-0.5 text-slate-300">{r.runbook}</dd>
                </div>
              ) : null}
              {r.outcome || r.resolutionMinutes !== null ? (
                <div className="rounded-md bg-[#111a2e] p-2.5">
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">Outcome</dt>
                  <dd className="mt-0.5 text-slate-300">
                    {r.outcome ? `Resolution ${r.outcome}` : "Outcome not recorded"}
                    {r.resolutionMinutes !== null ? ` · ${r.resolutionMinutes} min` : ""}
                  </dd>
                </div>
              ) : null}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecommendBody({ state }: { state: RecommendState }) {
  if (state.phase === "loading") {
    return <p className="text-sm text-[#8b99b5]">Generating recommendation from memory…</p>;
  }
  if (state.phase === "not-configured") {
    return (
      <StateLine tone="pending">
        <strong className="text-slate-300">Hindsight not configured.</strong> {state.message}
      </StateLine>
    );
  }
  if (state.phase === "error") {
    return (
      <StateLine tone="error">
        <strong>Recommendation failed.</strong> {state.message}
      </StateLine>
    );
  }
  if (state.phase === "empty") {
    return <StateLine tone="pending">{state.message}</StateLine>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle>Recommended root cause · fix · runbook</SectionTitle>
        <Badge className="bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30">
          Memory-grounded
        </Badge>
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
        {state.text}
      </div>
    </div>
  );
}
