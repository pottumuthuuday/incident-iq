export type Severity = "critical" | "high" | "medium" | "low";

export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";

export interface Incident {
  id: string;
  title: string;
  service: string;
  severity: Severity;
  status: IncidentStatus;
  errorMessage: string;
  description: string;
  logs: string[];
  createdAt: string; // ISO timestamp
  resolvedAt?: string;
  /** Minutes from open to resolution; present on resolved incidents. */
  resolutionMinutes?: number;
}

export interface TimelineEvent {
  id: string;
  label: string;
  detail?: string;
  timestamp: string;
  actor: "monitor" | "engineer" | "agent" | "system";
}

export interface RootCauseHypothesis {
  id: string;
  statement: string;
  confidence: number; // 0-100
  evidence: string[];
}

export interface ResolutionStep {
  id: string;
  order: number;
  action: string;
  detail: string;
}

export interface RunbookReference {
  id: string;
  name: string;
  matchedIncident: string;
  lastUsed: string;
  successRate: number; // 0-100
  steps: string[];
}

export interface SimilarIncident {
  id: string;
  title: string;
  service: string;
  severity: Severity;
  occurredAt: string;
  similarity: number; // 0-100
  rootCause: string;
  resolution: string;
}

export interface MemoryEntry {
  id: string;
  kind: "incident" | "root-cause" | "resolution" | "runbook" | "post-mortem";
  title: string;
  service: string;
  summary: string;
  retainedAt: string;
  source: "post-mortem" | "resolution" | "import";
  /** 0-100 — how relevant this memory was in past recalls. */
  relevance: number;
  recallCount: number;
}

export interface PostMortem {
  id: string;
  incidentId: string;
  title: string;
  service: string;
  severity: Severity;
  status: "draft" | "published" | "retained";
  summary: string;
  impact: string;
  durationMinutes: number;
  rootCause: string;
  resolution: string;
  whatWorked: string[];
  whatDidNotWork: string[];
  lessonsLearned: string[];
  runbookUsed: string;
  timeline: TimelineEvent[];
  createdAt: string;
  retainedToHindsight: boolean;
}

export interface EvidenceItem {
  id: string;
  label: string;
  source: string;
  detail: string;
}

/**
 * Everything the investigation view renders. Today it is filled from demo data;
 * later it will be produced by the FastAPI backend + Hindsight recall.
 */
export interface InvestigationBundle {
  incidentId: string;
  /** True when AI analysis has (demo) content; false shows an honest empty state. */
  analyzed: boolean;
  analysisSummary: string;
  hypotheses: RootCauseHypothesis[];
  resolutionSteps: ResolutionStep[];
  runbook: RunbookReference | null;
  similarIncidents: SimilarIncident[];
  evidence: EvidenceItem[];
  timeline: TimelineEvent[];
}
