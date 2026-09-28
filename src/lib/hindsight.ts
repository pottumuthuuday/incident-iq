import "server-only";

import { HindsightClient, HindsightError } from "@vectorize-io/hindsight-client";
import type {
  RecallResponse,
  RecallResult,
  ReflectResponse,
  RetainResponse,
} from "@vectorize-io/hindsight-client";

/**
 * REAL Hindsight Cloud integration — server-side only.
 *
 * This module is guarded by `import "server-only"`, so it can never be bundled
 * into client JavaScript. HINDSIGHT_API_KEY never reaches the browser: pages
 * talk to Next.js route handlers (src/app/api/*), and only those handlers use
 * this module.
 *
 * Configuration comes exclusively from environment variables:
 *   HINDSIGHT_API_KEY    — secret, .env.local only, never committed
 *   HINDSIGHT_BASE_URL   — default https://api.hindsight.vectorize.io
 *   HINDSIGHT_BANK_ID    — default "incidentiq"
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const HINDSIGHT_BANK_ID = process.env.HINDSIGHT_BANK_ID?.trim() || "incidentiq";

const HINDSIGHT_BASE_URL =
  process.env.HINDSIGHT_BASE_URL?.trim() || "https://api.hindsight.vectorize.io";

export function hindsightConfigStatus() {
  const hasKey = Boolean(process.env.HINDSIGHT_API_KEY?.trim());
  return {
    bankId: HINDSIGHT_BANK_ID,
    configured: hasKey,
    baseUrl: hasKey ? HINDSIGHT_BASE_URL : null,
    message: hasKey
      ? `Hindsight Cloud configured — memory bank "${HINDSIGHT_BANK_ID}".`
      : "HINDSIGHT_API_KEY is not set. Add it to .env.local (see .env.example). Memory features are disabled until configured.",
  };
}

function isConfigured(): boolean {
  return Boolean(process.env.HINDSIGHT_API_KEY?.trim());
}

/** Lazily-created singleton. Reads the key at call time, not import time. */
let cachedClient: HindsightClient | null = null;

function getClient(): HindsightClient {
  if (!isConfigured()) {
    throw new HindsightUnavailableError(
      "HINDSIGHT_API_KEY is not set — cannot talk to Hindsight Cloud."
    );
  }
  if (!cachedClient) {
    cachedClient = new HindsightClient({
      baseUrl: HINDSIGHT_BASE_URL,
      apiKey: process.env.HINDSIGHT_API_KEY!.trim(),
    });
  }
  return cachedClient;
}

// ---------------------------------------------------------------------------
// Typed errors — "not configured" vs "call failed" are surfaced distinctly
// ---------------------------------------------------------------------------

export class HindsightUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HindsightUnavailableError";
  }
}

export interface HindsightFailure {
  kind: "not-configured" | "connection-failed";
  message: string;
}

function toFailure(err: unknown): HindsightFailure {
  if (err instanceof HindsightUnavailableError) {
    return { kind: "not-configured", message: err.message };
  }
  if (err instanceof HindsightError) {
    return {
      kind: "connection-failed",
      message: `Hindsight API error${err.statusCode ? ` (HTTP ${err.statusCode})` : ""}: ${err.message}`,
    };
  }
  return {
    kind: "connection-failed",
    message: err instanceof Error ? err.message : "Unknown Hindsight error",
  };
}

// ---------------------------------------------------------------------------
// Status (used by /api/hindsight/status and the sidebar indicator)
// ---------------------------------------------------------------------------

export interface HindsightStatus {
  connected: boolean;
  configured: boolean;
  bankId: string;
  message: string;
  apiVersion?: string;
}

let cachedStatus: { at: number; value: HindsightStatus } | null = null;
const STATUS_TTL_MS = 30_000;

export async function getHindsightStatus(): Promise<HindsightStatus> {
  if (!isConfigured()) {
    const cfg = hindsightConfigStatus();
    return {
      connected: false,
      configured: false,
      bankId: cfg.bankId,
      message: cfg.message,
    };
  }

  // Serve a cached success for 30s to avoid calling /version on every render.
  if (cachedStatus && Date.now() - cachedStatus.at < STATUS_TTL_MS) {
    return cachedStatus.value;
  }

  try {
    const version = await getClient().getVersion();
    const value: HindsightStatus = {
      connected: true,
      configured: true,
      bankId: HINDSIGHT_BANK_ID,
      message: `Connected to Hindsight Cloud — memory bank "${HINDSIGHT_BANK_ID}".`,
      apiVersion: version.api_version,
    };
    cachedStatus = { at: Date.now(), value };
    return value;
  } catch (err) {
    const failure = toFailure(err);
    return {
      connected: false,
      configured: true,
      bankId: HINDSIGHT_BANK_ID,
      message: `Hindsight connection failed: ${failure.message}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Retain — store incident knowledge in the incidentiq memory bank
// ---------------------------------------------------------------------------

/** Every field required by the product spec for incident knowledge retention. */
export interface IncidentKnowledge {
  incidentId: string;
  service: string;
  severity: string;
  status: string;
  description: string;
  errorDetails: string;
  rootCause: string;
  resolutionSteps: string[];
  resolutionSucceeded: boolean;
  runbookUsed: string;
  resolutionTimeMinutes: number | null;
  whatWorked: string[];
  whatDidNotWork: string[];
  lessonsLearned: string[];
}

/**
 * Build the human-readable content that Hindsight will decompose into
 * structured facts. Written so the fact extractor can attribute each field
 * (ID, service, cause, steps…) cleanly.
 */
export function buildIncidentKnowledgeContent(k: IncidentKnowledge): string {
  const lines: string[] = [
    `Post-mortem for incident ${k.incidentId} (${k.service}, severity ${k.severity}, final status ${k.status}).`,
    `Incident description: ${k.description}`,
    `Error details: ${k.errorDetails}`,
    `Root cause: ${k.rootCause}`,
    `Resolution:`,
    ...(k.resolutionSteps.length > 0
      ? k.resolutionSteps.map((s) => `  - ${s}`)
      : ["  (no steps recorded)"]),
    `Resolution succeeded: ${k.resolutionSucceeded ? "yes" : "no"}`,
    `Runbook used: ${k.runbookUsed || "(none)"}`,
    `Resolution time: ${k.resolutionTimeMinutes !== null ? `${k.resolutionTimeMinutes} minutes` : "not recorded"}`,
  ];

  if (k.whatWorked.length > 0) {
    lines.push("What worked:", ...k.whatWorked.map((s) => `  - ${s}`));
  }
  if (k.whatDidNotWork.length > 0) {
    lines.push("What did not work:", ...k.whatDidNotWork.map((s) => `  - ${s}`));
  }
  if (k.lessonsLearned.length > 0) {
    lines.push("Lessons learned:", ...k.lessonsLearned.map((s) => `  - ${s}`));
  }

  return lines.join("\n");
}

export interface RetainOutcome {
  retained: boolean;
  documentId: string;
  message: string;
}

/**
 * Retain a completed post-mortem as a document in the incidentiq bank.
 * `documentId` makes retention idempotent: re-retaining the same post-mortem
 * replaces the previous version instead of duplicating memories.
 */
export async function retainIncidentKnowledge(
  knowledge: IncidentKnowledge
): Promise<RetainOutcome> {
  const documentId = `incident-${knowledge.incidentId}`;
  const content = buildIncidentKnowledgeContent(knowledge);

  try {
    const response: RetainResponse = await getClient().retain(HINDSIGHT_BANK_ID, content, {
      documentId,
      context: `IncidentIQ post-mortem for ${knowledge.incidentId}`,
      timestamp: new Date().toISOString(),
      tags: [
        `incident:${knowledge.incidentId}`,
        `service:${knowledge.service.toLowerCase().replace(/\s+/g, "-")}`,
        `severity:${knowledge.severity}`,
        "source:post-mortem",
      ],
      metadata: {
        incident_id: knowledge.incidentId,
        service: knowledge.service,
        severity: knowledge.severity,
        runbook: knowledge.runbookUsed,
        resolution_succeeded: String(knowledge.resolutionSucceeded),
        source: "incidentiq-post-mortem",
      },
    });

    if (!response.success) {
      return {
        retained: false,
        documentId,
        message: "Hindsight reported the retain as unsuccessful. Please retry.",
      };
    }

    return {
      retained: true,
      documentId,
      message: "Memory successfully retained in Hindsight.",
    };
  } catch (err) {
    // Rethrow with a clear, actionable message — the API route maps this to a 502.
    throw new Error(`Retain failed for ${documentId}: ${toFailure(err).message}`);
  }
}

// ---------------------------------------------------------------------------
// Recall — retrieve similar historical incidents for an active investigation
// ---------------------------------------------------------------------------

export interface RecalledIncident {
  memoryId: string;
  text: string;
  relevance: number; // 0-100, from Hindsight's reranker/final score
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

/** Parse "resolution time: 42 minutes" style text into minutes. */
function parseResolutionMinutes(text: string): number | null {
  const m = text.match(/resolution time:?\s*([0-9]+)\s*min/i);
  return m ? Number(m[1]) : null;
}

function parseIncidentId(text: string, metadata?: Record<string, string>): string | null {
  if (metadata?.incident_id) return metadata.incident_id;
  const m = text.match(/incident\s+([A-Z]{2,5}-\d+)/i);
  return m ? m[1] : null;
}

function firstSentence(text: string): string {
  const idx = text.search(/[.!?](\s|$)/);
  return idx === -1 ? text : text.slice(0, idx + 1);
}

function mapRecallResults(response: RecallResponse): RecalledIncident[] {
  return response.results.map((r: RecallResult) => {
    const text = r.text ?? "";
    const meta = r.metadata ?? {};
    const lower = text.toLowerCase();

    return {
      memoryId: r.id,
      text,
      // `final` is the ranking score; fall back to the reranker's normalized 0-1.
      relevance: Math.round(((r.scores?.final ?? r.scores?.reranker ?? 0) || 0) * 100),
      incidentId: parseIncidentId(text, meta),
      service: meta.service ?? r.entities?.[0] ?? null,
      severity: meta.severity ?? null,
      runbook: meta.runbook ?? (text.match(/runbook used:?\s*([^\n.]+)/i)?.[1]?.trim() ?? null),
      rootCause: lower.includes("root cause:")
        ? text.split(/root cause:/i)[1]?.split(/\n/)[0]?.trim() ?? null
        : null,
      resolution: lower.includes("resolution")
        ? text.split(/resolution:?/i)[1]?.split(/\n[^\s-]/)[0]?.trim() ?? null
        : null,
      outcome: /resolution succeeded:?\s*yes/i.test(text) ? "succeeded" : null,
      resolutionMinutes: parseResolutionMinutes(text),
      occurredStart: r.occurred_start ?? null,
      context: r.context ?? null,
    };
  });
}

export type RecallOutcome =
  | { state: "ok"; results: RecalledIncident[] }
  | { state: "empty"; message: string }
  | { state: "error"; failure: HindsightFailure };

/**
 * Recall historical incidents similar to the given incident context.
 * Returns an explicit state so the UI can distinguish
 * "no memories found" from "Hindsight connection failed".
 */
export async function recallSimilarIncidents(input: {
  title: string;
  service: string;
  severity: string;
  errorMessage: string;
  description?: string;
}): Promise<RecallOutcome> {
  const query = [
    `Historical incidents similar to: ${input.title}`,
    `Service: ${input.service}. Severity: ${input.severity}.`,
    input.errorMessage ? `Error: ${input.errorMessage}` : "",
    input.description ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const response = await getClient().recall(HINDSIGHT_BANK_ID, query, {
      types: ["world", "experience", "observation"],
      preferObservations: true,
      budget: "mid",
      maxTokens: 4096,
    });

    if (!response.results || response.results.length === 0) {
      return {
        state: "empty",
        message:
          "No memories found in Hindsight for this incident yet. Retain post-mortems to build memory.",
      };
    }
    return { state: "ok", results: mapRecallResults(response) };
  } catch (err) {
    return { state: "error", failure: toFailure(err) };
  }
}

/**
 * General-purpose recall used by the Hindsight Memory page.
 * Returns raw recalled facts (already mapped) for arbitrary queries.
 */
export async function recallMemories(query: string): Promise<RecallOutcome> {
  try {
    const response = await getClient().recall(HINDSIGHT_BANK_ID, query, {
      types: ["world", "experience", "observation"],
      preferObservations: true,
      budget: "high",
      maxTokens: 8192,
    });
    if (!response.results || response.results.length === 0) {
      return {
        state: "empty",
        message: "No memories found in Hindsight for this query.",
      };
    }
    return { state: "ok", results: mapRecallResults(response) };
  } catch (err) {
    return { state: "error", failure: toFailure(err) };
  }
}

// ---------------------------------------------------------------------------
// Reflect — recommendation grounded in retained memory
// ---------------------------------------------------------------------------

export type ReflectOutcome =
  | { state: "ok"; recommendation: string; basedOnCount: number | null }
  | { state: "empty"; message: string }
  | { state: "error"; failure: HindsightFailure };

/**
 * Generate a resolution recommendation using the memory bank as context via
 * Hindsight reflect. The query embeds the current incident so the answer
 * considers historical incidents, root causes, resolutions, runbooks and
 * post-mortem lessons retained in the bank.
 */
export async function reflectRecommendation(input: {
  title: string;
  service: string;
  severity: string;
  errorMessage: string;
  description?: string;
}): Promise<ReflectOutcome> {
  const query = [
    `We are investigating a new incident and need a resolution recommendation.`,
    `Incident: ${input.title}`,
    `Service: ${input.service}. Severity: ${input.severity}.`,
    input.errorMessage ? `Error observed: ${input.errorMessage}` : "",
    input.description ? `Details: ${input.description}` : "",
    `Based on similar historical incidents in memory, what is the most likely root cause,`,
    `what resolution steps succeeded before (with which runbook), and what did post-mortems learn?`,
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const response: ReflectResponse = await getClient().reflect(HINDSIGHT_BANK_ID, query, {
      includeFacts: true,
      budget: "mid",
    });

    if (!response.text || !response.text.trim()) {
      return {
        state: "empty",
        message: "Hindsight reflect returned no recommendation content.",
      };
    }
    return {
      state: "ok",
      recommendation: response.text.trim(),
      basedOnCount: null,
    };
  } catch (err) {
    return { state: "error", failure: toFailure(err) };
  }
}
