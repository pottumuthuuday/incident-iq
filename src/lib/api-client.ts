import type {
  Incident,
  InvestigationBundle,
  MemoryEntry,
  PostMortem,
} from "./types";

/**
 * Frontend data-access layer.
 *
 * TODAY: returns the labeled demo fixtures from lib/demo-data.ts.
 * LATER: when NEXT_PUBLIC_API_BASE_URL is set, these same functions will call
 * the Python FastAPI backend instead. Pages never talk to a backend directly —
 * they always go through this module, so the switch is a one-file change.
 *
 * Endpoint plan (FastAPI, future step):
 *   GET  /incidents                      → Incident[]
 *   GET  /incidents/{id}                 → Incident
 *   GET  /incidents/{id}/investigation   → InvestigationBundle
 *   POST /incidents                      → Incident
 *   GET  /post-mortems                   → PostMortem[]
 *   GET  /post-mortems/{id}              → PostMortem
 *   POST /post-mortems/{id}/retain       → Hindsight retention (backend-triggered)
 *   GET  /memory?query=…                 → MemoryEntry[] (Hindsight recall via backend)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export const isBackendConfigured = Boolean(API_BASE);

function assertBackend(): string {
  if (!API_BASE) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not set — the FastAPI backend is not connected yet."
    );
  }
  return API_BASE;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${assertBackend()}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

export async function listIncidents(): Promise<Incident[]> {
  if (!API_BASE) {
    const { incidents } = await import("./demo-data");
    return incidents;
  }
  return getJson<Incident[]>("/incidents");
}

export async function getIncidentById(id: string): Promise<Incident | undefined> {
  if (!API_BASE) {
    const { getIncident } = await import("./demo-data");
    return getIncident(id);
  }
  return getJson<Incident>(`/incidents/${encodeURIComponent(id)}`);
}

export async function createIncident(
  input: Pick<
    Incident,
    "title" | "service" | "severity" | "errorMessage" | "description" | "logs"
  > & { createdAt?: string }
): Promise<Incident> {
  // POSTs to the Next.js route handler, which stores the incident server-side
  // (src/lib/incident-store.ts) so the server-rendered investigation page can
  // resolve it. No Hindsight memory is written by incident creation.
  const res = await fetch("/api/incidents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = payload?.error?.message ?? `API ${res.status} on POST /api/incidents`;
    throw new Error(message);
  }
  return payload.data.incident as Incident;
}

// ---------------------------------------------------------------------------
// Investigation
// ---------------------------------------------------------------------------

export async function getInvestigationBundle(incident: Incident): Promise<InvestigationBundle> {
  if (!API_BASE) {
    const { getInvestigation } = await import("./demo-data");
    return getInvestigation(incident);
  }
  return getJson<InvestigationBundle>(
    `/incidents/${encodeURIComponent(incident.id)}/investigation`
  );
}

// ---------------------------------------------------------------------------
// Post-mortems
// ---------------------------------------------------------------------------

export async function listPostMortems(): Promise<PostMortem[]> {
  if (!API_BASE) {
    const { postMortems } = await import("./demo-data");
    return postMortems;
  }
  return getJson<PostMortem[]>("/post-mortems");
}

export async function getPostMortemById(id: string): Promise<PostMortem | undefined> {
  if (!API_BASE) {
    const { getPostMortem } = await import("./demo-data");
    return getPostMortem(id);
  }
  return getJson<PostMortem>(`/post-mortems/${encodeURIComponent(id)}`);
}

/**
 * UI-ONLY in this build. Does NOT save anything to Hindsight.
 * When the backend exists this will POST /post-mortems/{id}/retain and the
 * FastAPI service will call the real Hindsight Cloud API.
 */
export async function retainPostMortem(_pm: PostMortem): Promise<{ retained: false }> {
  return { retained: false };
}

// ---------------------------------------------------------------------------
// Hindsight memory (read-only surfaces)
// ---------------------------------------------------------------------------

export async function listMemoryEntries(): Promise<MemoryEntry[]> {
  if (!API_BASE) {
    const { memoryEntries } = await import("./demo-data");
    return memoryEntries;
  }
  return getJson<MemoryEntry[]>("/memory");
}
