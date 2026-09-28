import "server-only";

import type { Incident } from "./types";
import { getIncident as getDemoIncident, incidents as demoIncidents } from "./demo-data";

/**
 * Server-side runtime store for incidents created through the New Incident
 * form (POST /api/incidents). Demo data stays untouched in lib/demo-data.ts —
 * this store only holds incidents created at runtime, in-process.
 *
 * Important: Next.js dev compiles each route handler / page as its own module
 * instance, so a plain module-level array would NOT be shared between
 * /api/incidents (writes) and /incidents/[id] (reads). Anchoring the store on
 * globalThis makes it process-wide, which is the standard Next.js singleton
 * pattern for in-memory dev state.
 *
 * The Hindsight architecture is unchanged: retaining to memory still happens
 * exclusively through the post-mortem editor's Retain button.
 */

interface IncidentStore {
  createdIncidents: Incident[];
}

const globalRef = globalThis as typeof globalThis & {
  __incidentiqIncidentStore?: IncidentStore;
};

const store: IncidentStore = globalRef.__incidentiqIncidentStore ?? {
  createdIncidents: [],
};
globalRef.__incidentiqIncidentStore = store;

/** Persist a validated incident (newest first). */
export function storeIncident(incident: Incident): void {
  store.createdIncidents.unshift(incident);
}

/** Look up a runtime-created incident by id. */
export function getStoredIncident(id: string): Incident | undefined {
  const wanted = decodeURIComponent(id);
  return store.createdIncidents.find((i) => i.id === wanted);
}

/** Resolve any incident id: UI-created first, then the demo corpus. */
export function findIncident(id: string): Incident | undefined {
  return getStoredIncident(id) ?? getDemoIncident(id);
}

/** All incidents — runtime-created ones first (newest), then demo data. */
export function allIncidents(): Incident[] {
  return [...store.createdIncidents, ...demoIncidents];
}

/** Next free INC-<n> id across the store and the demo corpus. */
export function nextIncidentId(): string {
  const nums = allIncidents()
    .map((i) => Number.parseInt(i.id.replace(/^INC-/, ""), 10))
    .filter((n) => Number.isFinite(n));
  let n = (nums.length > 0 ? Math.max(...nums) : 2041) + 1;
  while (findIncident(`INC-${n}`)) n += 1;
  return `INC-${n}`;
}
