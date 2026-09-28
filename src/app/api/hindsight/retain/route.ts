import {
  retainIncidentKnowledge,
  hindsightConfigStatus,
  type IncidentKnowledge,
} from "@/lib/hindsight";
import { jsonError, jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Validates and coerces an unknown body into IncidentKnowledge. */
function parseKnowledge(raw: unknown): IncidentKnowledge | null {
  if (typeof raw !== "object" || raw === null) return null;
  const b = raw as Record<string, unknown>;

  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const bool = (v: unknown): boolean => v === true || v === "true";
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : null;

  if (!b.incidentId || typeof b.incidentId !== "string") return null;

  return {
    incidentId: b.incidentId,
    service: str(b.service),
    severity: str(b.severity),
    status: str(b.status) || "resolved",
    description: str(b.description),
    errorDetails: str(b.errorDetails),
    rootCause: str(b.rootCause),
    resolutionSteps: strArr(b.resolutionSteps),
    resolutionSucceeded: bool(b.resolutionSucceeded),
    runbookUsed: str(b.runbookUsed),
    resolutionTimeMinutes: num(b.resolutionTimeMinutes),
    whatWorked: strArr(b.whatWorked),
    whatDidNotWork: strArr(b.whatDidNotWork),
    lessonsLearned: strArr(b.lessonsLearned),
  };
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError("connection-failed", "Invalid JSON body", 400);
  }

  const knowledge = parseKnowledge(raw);
  if (!knowledge) {
    return jsonError("connection-failed", "incidentId is required and must be a string", 400);
  }

  if (!hindsightConfigStatus().configured) {
    return jsonError("not-configured", hindsightConfigStatus().message, 503);
  }

  try {
    const outcome = await retainIncidentKnowledge(knowledge);
    return jsonOk(outcome);
  } catch (err) {
    return jsonError(
      "connection-failed",
      err instanceof Error ? err.message : "Retain failed",
      502
    );
  }
}
