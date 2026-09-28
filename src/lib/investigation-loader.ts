import "server-only";

import type { Incident, InvestigationBundle, Severity, SimilarIncident } from "./types";
import { getAnalysisStatus, runAnalysis } from "./analysis-client";
import { recallSimilarIncidents } from "./hindsight";
import { getInvestigation } from "./demo-data";

/**
 * Single source of truth for building an investigation bundle:
 *
 *   live path  → real Hindsight recall + FastAPI analysis agent
 *   fallback   → curated demo bundle / honest empty state
 *
 * Used by the incident investigation page and the analysis API route that
 * feeds the post-mortem draft editor.
 */

export interface LiveAnalysisMeta {
  generatedBy: string;
  llmUsed: boolean;
  memoryCount: number;
}

export interface InvestigationLoad {
  bundle: InvestigationBundle;
  /** True when the bundle came from the live FastAPI + Hindsight pipeline. */
  live: boolean;
  /** Why the live path was skipped/failed, when it was attempted. */
  note: string | null;
  /** Backend status info for the not-connected panel. */
  backendAvailable: boolean;
  backendMessage: string | null;
  meta: LiveAnalysisMeta | null;
}

function asSeverity(value: string | null): Severity {
  return value === "critical" || value === "high" || value === "medium" || value === "low"
    ? value
    : "medium";
}

export async function loadInvestigation(incident: Incident): Promise<InvestigationLoad> {
  const status = await getAnalysisStatus();

  let live: {
    bundle: InvestigationBundle;
    meta: LiveAnalysisMeta;
  } | null = null;
  let note: string | null = null;

  if (status.available) {
    const recall = await recallSimilarIncidents({
      title: incident.title,
      service: incident.service,
      severity: incident.severity,
      errorMessage: incident.errorMessage,
      description: incident.description,
    });

    if (recall.state === "ok") {
      const result = await runAnalysis({
        incidentId: incident.id,
        title: incident.title,
        service: incident.service,
        severity: incident.severity,
        errorMessage: incident.errorMessage,
        description: incident.description,
        logs: incident.logs,
        detectedAt: incident.createdAt,
        memories: recall.results,
      });

      if (result.state === "ok") {
        // Populate "Similar incidents" from the real recalled memories, merged
        // per incident (Hindsight often recalls several facts of one incident);
        // the agent's similar-incident reasoning rides in analysisSummary.
        const NOT_RECORDED = "Not recorded in the retained memory";
        const mapped: SimilarIncident[] = recall.results
          .filter((m) => m.incidentId)
          .map((m) => ({
            id: m.incidentId as string,
            title: (m.text.split(".")[0] || `Retained memory ${m.memoryId}`).slice(0, 100),
            service: m.service ?? "unknown",
            severity: asSeverity(m.severity),
            occurredAt: m.occurredStart ?? incident.createdAt,
            similarity: m.relevance,
            rootCause: m.rootCause ?? NOT_RECORDED,
            resolution: m.resolution ?? NOT_RECORDED,
          }));
        const similarIncidents: SimilarIncident[] = [];
        for (const s of mapped) {
          const existing = similarIncidents.find((x) => x.id === s.id);
          if (!existing) {
            similarIncidents.push(s);
          } else {
            existing.similarity = Math.max(existing.similarity, s.similarity);
            if (s.rootCause !== NOT_RECORDED && existing.rootCause === NOT_RECORDED) {
              existing.rootCause = s.rootCause;
            }
            if (s.resolution !== NOT_RECORDED && existing.resolution === NOT_RECORDED) {
              existing.resolution = s.resolution;
            }
          }
        }
        similarIncidents.sort((a, b) => b.similarity - a.similarity);

        live = {
          bundle: { ...result.bundle, similarIncidents },
          meta: {
            generatedBy: result.generatedBy,
            llmUsed: result.llmUsed,
            memoryCount: recall.results.length,
          },
        };
      } else {
        note = result.message;
      }
    } else if (recall.state === "error") {
      note = `Hindsight recall failed: ${recall.failure.message}`;
    } else {
      note = recall.message;
    }
  }

  return {
    bundle: live?.bundle ?? getInvestigation(incident),
    live: live !== null,
    note,
    backendAvailable: status.available,
    backendMessage: status.message,
    meta: live?.meta ?? null,
  };
}
