"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  SectionTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Incident } from "@/lib/types";

/* =========================================================
   TYPES
   ========================================================= */

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

/* =========================================================
   API HELPER
   ========================================================= */

async function postJson<T>(
  url: string,
  body: unknown
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const err = payload?.error;

    const message =
      err?.message ??
      `Request failed (HTTP ${res.status})`;

    const e = new Error(message) as Error & {
      kind?: string;
    };

    e.kind = err?.kind;

    throw e;
  }

  return payload.data as T;
}

/* =========================================================
   SMALL UI COMPONENTS
   ========================================================= */

function LiveMemoryBadge() {
  return (
    <Badge className="border border-emerald-400/20 bg-emerald-400/10 text-[9px] uppercase tracking-wider text-emerald-300">
      ● Live Hindsight
    </Badge>
  );
}

function MemoryGroundedBadge() {
  return (
    <Badge className="border border-violet-400/20 bg-violet-400/10 text-[9px] uppercase tracking-wider text-violet-300">
      ✦ Memory grounded
    </Badge>
  );
}

function StateLine({
  tone,
  children,
}: {
  tone: "error" | "pending";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-4 text-xs leading-5 ${
        tone === "error"
          ? "border-rose-400/20 bg-rose-400/[0.04] text-rose-300"
          : "border-dashed border-white/[0.1] bg-white/[0.02] text-slate-500"
      }`}
    >
      {children}
    </div>
  );
}

/* =========================================================
   RELEVANCE SCORE
   ========================================================= */

function RelevanceScore({
  value,
}: {
  value: number;
}) {
  const normalized = Math.max(
    0,
    Math.min(value, 100)
  );

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
        Relevance
      </span>

      <span className="rounded-full border border-sky-400/15 bg-sky-400/[0.06] px-2 py-1 font-mono text-[10px] font-semibold text-sky-300">
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   RECALL BODY
   ========================================================= */

function RecallBody({
  state,
  loaded,
}: {
  state: RecallState;
  loaded: boolean;
}) {
  if (state.phase === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-violet-400/10 bg-violet-400/[0.025] p-4">
        <div className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />

        <div>
          <p className="text-xs font-medium text-violet-200">
            {loaded
              ? "Refreshing organizational memory..."
              : "Querying Hindsight memory..."}
          </p>

          <p className="mt-1 text-[10px] text-slate-600">
            Searching previous incidents, root causes and
            resolutions.
          </p>
        </div>
      </div>
    );
  }

  if (state.phase === "not-configured") {
    return (
      <StateLine tone="pending">
        <strong className="text-slate-300">
          Hindsight not configured.
        </strong>{" "}
        {state.message}
        <p className="mt-1 text-[10px] text-slate-600">
          No placeholder memory is displayed.
        </p>
      </StateLine>
    );
  }

  if (state.phase === "error") {
    return (
      <StateLine tone="error">
        <strong>Hindsight connection failed.</strong>{" "}
        {state.message}
        <p className="mt-1 text-[10px] text-rose-400/60">
          Historical memories could not be retrieved.
        </p>
      </StateLine>
    );
  }

  if (state.phase === "empty") {
    return (
      <StateLine tone="pending">
        {state.message}
      </StateLine>
    );
  }

  return (
    <div>
      {/* MEMORY SUMMARY */}

      <div className="mb-4 rounded-xl border border-violet-400/15 bg-violet-400/[0.035] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-300">
              Organizational memory
            </p>

            <p className="mt-1 text-sm font-semibold text-white">
              {state.results.length} historical memories found
            </p>

            <p className="mt-1 text-[10px] text-slate-500">
              Hindsight searched previously retained incident
              knowledge for this investigation.
            </p>
          </div>

          <LiveMemoryBadge />
        </div>
      </div>

      {/* MEMORY CARDS */}

      <div className="space-y-3">
        {state.results.map((r, index) => (
          <article
            key={r.memoryId}
            className="group rounded-xl border border-white/[0.07] bg-white/[0.015] p-4 transition-all duration-200 hover:border-violet-400/20 hover:bg-violet-400/[0.02]"
          >
            {/* HEADER */}

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-400/10 text-[9px] font-bold text-violet-300">
                    {index + 1}
                  </span>

                  <p className="text-sm font-semibold text-slate-100">
                    {r.incidentId ?? "Memory"}
                  </p>

                  {r.service ? (
                    <span className="text-[10px] text-slate-500">
                      · {r.service}
                    </span>
                  ) : null}

                  {r.severity ? (
                    <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[9px] capitalize text-slate-500">
                      {r.severity}
                    </span>
                  ) : null}
                </div>
              </div>

              <RelevanceScore value={r.relevance} />
            </div>

            {/* MEMORY TEXT */}

            <p className="mt-3 text-xs leading-5 text-slate-400">
              {r.text}
            </p>

            {/* MEMORY KNOWLEDGE */}

            {(r.rootCause ||
              r.resolution ||
              r.runbook ||
              r.outcome ||
              r.resolutionMinutes !== null) && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {r.rootCause ? (
                  <MemoryDetail
                    label="Root cause"
                    icon="◉"
                    value={r.rootCause}
                  />
                ) : null}

                {r.resolution ? (
                  <MemoryDetail
                    label="Resolution"
                    icon="✓"
                    value={r.resolution}
                  />
                ) : null}

                {r.runbook ? (
                  <MemoryDetail
                    label="Runbook"
                    icon="▤"
                    value={r.runbook}
                  />
                ) : null}

                {r.outcome ||
                r.resolutionMinutes !== null ? (
                  <MemoryDetail
                    label="Outcome"
                    icon="↗"
                    value={`${r.outcome ?? "Recorded"}${
                      r.resolutionMinutes !== null
                        ? ` · ${r.resolutionMinutes} min`
                        : ""
                    }`}
                  />
                ) : null}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   MEMORY DETAIL
   ========================================================= */

function MemoryDetail({
  label,
  icon,
  value,
}: {
  label: string;
  icon: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-black/10 p-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-violet-300">
          {icon}
        </span>

        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          {label}
        </span>
      </div>

      <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   RECOMMENDATION FORMATTER
   ========================================================= */

function formatRecommendationLine(
  line: string,
  index: number
) {
  const trimmed = line.trim();

  if (!trimmed) {
    return null;
  }

  /* Markdown headings */

  if (
    trimmed.startsWith("###") ||
    trimmed.startsWith("##") ||
    trimmed.startsWith("#")
  ) {
    const title = trimmed.replace(/^#+\s*/, "");

    return (
      <div
        key={`heading-${index}`}
        className="border-b border-white/[0.06] pb-2 pt-4 first:pt-0"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">
          {title}
        </p>
      </div>
    );
  }

  /* Numbered steps */

  const numbered = trimmed.match(
    /^(\d+)[.)]\s*(.*)$/
  );

  if (numbered) {
    return (
      <div
        key={`step-${index}`}
        className="flex gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] p-3"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/10 text-[10px] font-bold text-sky-300">
          {numbered[1]}
        </span>

        <p className="text-xs leading-5 text-slate-300">
          {cleanMarkdown(numbered[2])}
        </p>
      </div>
    );
  }

  /* Bullet points */

  if (
    trimmed.startsWith("- ") ||
    trimmed.startsWith("* ") ||
    trimmed.startsWith("• ")
  ) {
    return (
      <div
        key={`bullet-${index}`}
        className="flex gap-2"
      >
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />

        <p className="text-xs leading-5 text-slate-400">
          {cleanMarkdown(
            trimmed.replace(/^[-*•]\s*/, "")
          )}
        </p>
      </div>
    );
  }

  return (
    <p
      key={`paragraph-${index}`}
      className="text-xs leading-5 text-slate-400"
    >
      {cleanMarkdown(trimmed)}
    </p>
  );
}

/* =========================================================
   SIMPLE MARKDOWN CLEANER
   ========================================================= */

function cleanMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1");
}

/* =========================================================
   RECOMMENDATION BODY
   ========================================================= */

function RecommendBody({
  state,
}: {
  state: RecommendState;
}) {
  if (state.phase === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-violet-400/10 bg-violet-400/[0.025] p-4">
        <div className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />

        <div>
          <p className="text-xs font-medium text-violet-200">
            Reflecting over retained knowledge...
          </p>

          <p className="mt-1 text-[10px] text-slate-600">
            Hindsight is generating a memory-grounded
            recommendation.
          </p>
        </div>
      </div>
    );
  }

  if (state.phase === "not-configured") {
    return (
      <StateLine tone="pending">
        <strong className="text-slate-300">
          Hindsight not configured.
        </strong>{" "}
        {state.message}
      </StateLine>
    );
  }

  if (state.phase === "error") {
    return (
      <StateLine tone="error">
        <strong>Recommendation failed.</strong>{" "}
        {state.message}
      </StateLine>
    );
  }

  if (state.phase === "empty") {
    return (
      <StateLine tone="pending">
        {state.message}
      </StateLine>
    );
  }

  const lines = state.text.split(/\r?\n/);

  return (
    <div>
      {/* RECOMMENDATION HERO */}

      <div className="mb-5 rounded-xl border border-violet-400/15 bg-gradient-to-r from-violet-400/[0.07] to-sky-400/[0.025] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-lg">
            🧠
          </div>

          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-violet-300">
              Hindsight reflect
            </p>

            <p className="mt-1 text-sm font-semibold text-white">
              Recommendation grounded in organizational memory
            </p>

            <p className="mt-1 text-[10px] text-slate-500">
              The agent used retained incidents, causes, runbooks
              and lessons to inform this response.
            </p>
          </div>
        </div>
      </div>

      {/* RECOMMENDATION CONTENT */}

      <div className="space-y-2">
        {lines.map((line, index) =>
          formatRecommendationLine(line, index)
        )}
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export function HindsightInvestigation({
  incident,
}: {
  incident: Incident;
}) {
  const [recall, setRecall] =
    useState<RecallState>({
      phase: "loading",
    });

  const [recommendation, setRecommendation] =
    useState<RecommendState>({
      phase: "loading",
    });

  const [recallLoaded, setRecallLoaded] =
    useState(false);

  const incidentInput = {
    title: incident.title,
    service: incident.service,
    severity: incident.severity,
    errorMessage: incident.errorMessage,
    description: incident.description,
  };

  useEffect(() => {
    let cancelled = false;

    /* =====================================================
       RECALL
       ===================================================== */

    postJson<{
      state: "ok" | "empty";
      results?: RecalledIncident[];
      message?: string;
    }>(
      "/api/hindsight/recall",
      incidentInput
    )
      .then((data) => {
        if (cancelled) return;

        setRecallLoaded(true);

        if (
          data.state === "ok" &&
          data.results
        ) {
          setRecall({
            phase: "ok",
            results: data.results,
          });
        } else {
          setRecall({
            phase: "empty",
            message:
              data.message ??
              "No memories found in Hindsight for this incident yet.",
          });
        }
      })
      .catch(
        (err: Error & { kind?: string }) => {
          if (cancelled) return;

          setRecallLoaded(true);

          if (err.kind === "not-configured") {
            setRecall({
              phase: "not-configured",
              message: err.message,
            });
          } else {
            setRecall({
              phase: "error",
              message: err.message,
            });
          }
        }
      );

    /* =====================================================
       MEMORY-GROUNDED RECOMMENDATION
       ===================================================== */

    postJson<{
      state: "ok" | "empty";
      recommendation?: string;
      message?: string;
    }>(
      "/api/hindsight/recommendation",
      incidentInput
    )
      .then((data) => {
        if (cancelled) return;

        if (
          data.state === "ok" &&
          data.recommendation
        ) {
          setRecommendation({
            phase: "ok",
            text: data.recommendation,
          });
        } else {
          setRecommendation({
            phase: "empty",
            message:
              data.message ??
              "No recommendation could be generated from memory.",
          });
        }
      })
      .catch(
        (err: Error & { kind?: string }) => {
          if (cancelled) return;

          if (err.kind === "not-configured") {
            setRecommendation({
              phase: "not-configured",
              message: err.message,
            });
          } else {
            setRecommendation({
              phase: "error",
              message: err.message,
            });
          }
        }
      );

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident.id]);

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="space-y-4">
      {/* MEMORY FLOW HEADER */}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.035] p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-violet-300">
            01 · Recall
          </p>

          <p className="mt-1.5 text-xs font-semibold text-white">
            Search the past
          </p>

          <p className="mt-1 text-[10px] leading-4 text-slate-600">
            Find similar incidents and previous resolutions.
          </p>
        </div>

        <div className="rounded-xl border border-sky-400/15 bg-sky-400/[0.025] p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-sky-300">
            02 · Reason
          </p>

          <p className="mt-1.5 text-xs font-semibold text-white">
            Connect the evidence
          </p>

          <p className="mt-1 text-[10px] leading-4 text-slate-600">
            Compare current signals against retained knowledge.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.025] p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-emerald-300">
            03 · Recommend
          </p>

          <p className="mt-1.5 text-xs font-semibold text-white">
            Apply what worked
          </p>

          <p className="mt-1 text-[10px] leading-4 text-slate-600">
            Generate a response grounded in previous outcomes.
          </p>
        </div>
      </div>

      {/* ACTUAL HINDSIGHT */}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-violet-400/15">
          <CardHeader
            title="🧠 Hindsight Memory"
            subtitle="Real historical knowledge recalled from the incidentiq memory bank"
            actions={<LiveMemoryBadge />}
          />

          <CardBody>
            <RecallBody
              state={recall}
              loaded={recallLoaded}
            />
          </CardBody>
        </Card>

        <Card className="border-violet-400/15">
          <CardHeader
            title="AI recommendation"
            subtitle="Generated from retained incidents, causes, runbooks and lessons"
            actions={<MemoryGroundedBadge />}
          />

          <CardBody>
            <RecommendBody
              state={recommendation}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}