import "server-only";

import type { InvestigationBundle } from "./types";

/**
 * Server-side client for the FastAPI analysis backend (backend/main.py).
 *
 * Configured exclusively via ANALYSIS_API_URL (server env — never exposed to
 * the browser). Every function degrades honestly: if the backend is
 * unreachable, callers get `{ available: false, ... }` and the UI shows a
 * clear status instead of crashing or faking data.
 */

const ANALYSIS_API_URL = process.env.ANALYSIS_API_URL?.trim() || "http://127.0.0.1:8000";

export interface AnalysisStatus {
  available: boolean;
  url: string;
  llmProvider: string | null;
  llmModel: string | null;
  llmKeyConfigured: boolean | null;
  message: string;
}

/** Ask the backend for availability. Cached for 30s to avoid hammering /health. */
let cachedStatus: { at: number; value: AnalysisStatus } | null = null;
const STATUS_TTL_MS = 30_000;

export async function getAnalysisStatus(): Promise<AnalysisStatus> {
  if (cachedStatus && Date.now() - cachedStatus.at < STATUS_TTL_MS) {
    return cachedStatus.value;
  }

  try {
    const res = await fetch(`${ANALYSIS_API_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const health = (await res.json()) as {
      status?: string;
      llm?: { provider?: string; model?: string; apiKeyConfigured?: boolean };
    };
    const value: AnalysisStatus = {
      available: health.status === "ok",
      url: ANALYSIS_API_URL,
      llmProvider: health.llm?.provider ?? null,
      llmModel: health.llm?.model ?? null,
      llmKeyConfigured: health.llm?.apiKeyConfigured ?? null,
      message:
        health.status === "ok"
          ? `Analysis backend connected (${health.llm?.provider ?? "unknown"} · ${health.llm?.model ?? "unknown"}).`
          : "Analysis backend responded but reported an unhealthy state.",
    };
    cachedStatus = { at: Date.now(), value };
    return value;
  } catch {
    const value: AnalysisStatus = {
      available: false,
      url: ANALYSIS_API_URL,
      llmProvider: null,
      llmModel: null,
      llmKeyConfigured: null,
      message: `Analysis backend not reachable at ${ANALYSIS_API_URL}.`,
    };
    // Don't cache failures for the full TTL — the backend may come back any second.
    return value;
  }
}

/** LLM-analyzer request body: incident facts + the Hindsight memories recalled for it. */
export interface AnalysisInput {
  incidentId?: string;
  title: string;
  service: string;
  severity: string;
  errorMessage?: string;
  description?: string;
  logs?: string[];
  detectedAt?: string;
  memories?: Array<{
    memoryId?: string | null;
    text?: string | null;
    relevance?: number | null;
    incidentId?: string | null;
    service?: string | null;
    severity?: string | null;
    rootCause?: string | null;
    resolution?: string | null;
    runbook?: string | null;
    outcome?: string | null;
    resolutionMinutes?: number | null;
  }>;
}

export type AnalysisResult =
  | { state: "ok"; bundle: InvestigationBundle; generatedBy: string; llmUsed: boolean }
  | { state: "unavailable"; message: string }
  | { state: "error"; message: string };

/**
 * Run the analysis agent. Returns an explicit state so the UI can distinguish
 * "backend down" from a hard failure — and never fabricates content.
 */
export async function runAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
  let res: Response;
  try {
    res = await fetch(`${ANALYSIS_API_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    return { state: "unavailable", message: `Analysis backend not reachable at ${ANALYSIS_API_URL}.` };
  }

  if (!res.ok) {
    return { state: "error", message: `Analysis backend returned HTTP ${res.status}.` };
  }

  const payload = (await res.json().catch(() => null)) as {
    incidentId?: string | null;
    summary?: string;
    hypotheses?: InvestigationBundle["hypotheses"];
    resolutionSteps?: InvestigationBundle["resolutionSteps"];
    runbook?: InvestigationBundle["runbook"];
    similarIncidentReasoning?: Array<{ incidentId: string | null; title: string; reasoning: string }>;
    evidence?: InvestigationBundle["evidence"];
    generatedBy?: string;
    llmUsed?: boolean;
  } | null;

  if (!payload || !Array.isArray(payload.hypotheses)) {
    return { state: "error", message: "Analysis backend returned an unexpected response shape." };
  }

  const bundle: InvestigationBundle = {
    incidentId: input.incidentId ?? "",
    analyzed: true,
    analysisSummary: payload.summary ?? "",
    hypotheses: payload.hypotheses,
    resolutionSteps: payload.resolutionSteps ?? [],
    runbook: payload.runbook ?? null,
    similarIncidents: [],
    evidence: payload.evidence ?? [],
    timeline: [],
  };
  // Expose the similar-incident reasoning through the bundle's analysis summary
  // context without breaking the InvestigationBundle shape.
  const reasoning = payload.similarIncidentReasoning ?? [];
  if (reasoning.length > 0) {
    bundle.analysisSummary =
      `${bundle.analysisSummary}\n\nSimilar-incident reasoning:\n` +
      reasoning
        .map((r) => `• ${r.incidentId ?? "Memory"} — ${r.reasoning}`)
        .join("\n");
  }

  return {
    state: "ok",
    bundle,
    generatedBy: payload.generatedBy ?? "unknown",
    llmUsed: Boolean(payload.llmUsed),
  };
}
