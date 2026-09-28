import type { Incident, Severity } from "@/lib/types";
import { storeIncident, nextIncidentId } from "@/lib/incident-store";
import { jsonOk, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

/** Coerce an unknown body into a valid Incident; collect problems when invalid. */
function parseIncident(raw: unknown): { incident: Incident | null; problems: string[] } {
  const problems: string[] = [];
  if (typeof raw !== "object" || raw === null) {
    return { incident: null, problems: ["Request body must be a JSON object."] };
  }
  const b = raw as Record<string, unknown>;

  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

  const title = str(b.title);
  if (!title) problems.push("title is required.");

  const service = str(b.service);
  if (!service) problems.push("service is required.");

  const severityRaw = str(b.severity);
  const severity = (SEVERITIES as string[]).includes(severityRaw)
    ? (severityRaw as Severity)
    : null;
  if (!severity) problems.push(`severity must be one of: ${SEVERITIES.join(", ")}.`);

  const errorMessage = str(b.errorMessage);
  if (!errorMessage) problems.push("errorMessage is required.");

  const description = str(b.description);
  const logs = Array.isArray(b.logs)
    ? b.logs.filter((l): l is string => typeof l === "string" && l.trim() !== "").map((l) => l.trim())
    : [];

  let createdAt = str(b.createdAt);
  if (!createdAt) {
    createdAt = new Date().toISOString();
  } else if (Number.isNaN(new Date(createdAt).getTime())) {
    problems.push("createdAt must be a valid ISO timestamp.");
    createdAt = "";
  }

  if (problems.length > 0 || !severity || !createdAt) {
    return { incident: null, problems };
  }

  const incident: Incident = {
    id: nextIncidentId(),
    title,
    service,
    severity,
    status: "investigating",
    errorMessage,
    description,
    logs,
    createdAt,
  };
  return { incident, problems };
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError("connection-failed", "Invalid JSON body", 400);
  }

  const { incident, problems } = parseIncident(raw);
  if (!incident) {
    return jsonError("connection-failed", problems.join(" "), 400);
  }

  storeIncident(incident);

  return jsonOk({ incident, url: `/incidents/${incident.id}` }, 201);
}
