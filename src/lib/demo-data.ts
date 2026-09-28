import type {
  Incident,
  InvestigationBundle,
  MemoryEntry,
  PostMortem,
  TimelineEvent,
} from "./types";

/**
 * ⚠️  DEMO DATA — 100% SYNTHETIC
 *
 * Nothing in this file comes from Hindsight, a backend, or any real system.
 * Every surface that renders this data displays a visible "DEMO DATA" marker.
 * When the FastAPI backend + real Hindsight Cloud integration lands, these
 * fixtures are replaced by API responses (see lib/api-client.ts).
 */

export const SERVICES = [
  "Payment API",
  "Authentication Service",
  "Order Service",
  "Database",
  "Notification Service",
  "API Gateway",
] as const;

export const INCIDENT_TYPES = [
  "Database connection timeout",
  "API latency spike",
  "Authentication failure",
  "Memory leak",
  "Redis connection failure",
  "Deployment failure",
] as const;

/** Fixed anchor so relative times are stable across a session render. */
export const DEMO_NOW = new Date("2026-09-27T10:15:00Z");

function minutesAgo(m: number): string {
  return new Date(DEMO_NOW.getTime() - m * 60_000).toISOString();
}

function daysAgo(d: number): string {
  return minutesAgo(d * 24 * 60);
}

export const incidents: Incident[] = [
  {
    id: "INC-2041",
    title: "Database connection timeout on Payment API",
    service: "Payment API",
    severity: "critical",
    status: "investigating",
    errorMessage: "psycopg2.OperationalError: connection to server at \"10.0.4.12\", port 5432 failed: timeout expired",
    description:
      "Payment authorization requests are failing across all regions. Connection pool exhaustion on the primary Postgres writer began after the 09:42 deployment. Customer checkout attempts return 504s; retry storms are amplifying pool pressure.",
    logs: [
      "2026-09-27T09:41:58Z INFO  deploy-bot: release 2026.09.27-0942 rolled out to payment-api prod (12 pods)",
      "2026-09-27T09:42:31Z WARN  payment-api: db.pool acquire wait exceeded 5000ms (p95), pool=40 active=40 idle=0",
      "2026-09-27T09:43:12Z ERROR payment-api: psycopg2.OperationalError: connection to server at \"10.0.4.12\", port 5432 failed: timeout expired",
      "2026-09-27T09:43:14Z ERROR payment-api: checkout authorization failed txn=8f21c req_id=req-7d31a region=us-east-1",
      "2026-09-27T09:44:00Z ERROR payment-api: checkout authorization failed txn=8f22d req_id=req-7d31b region=eu-west-1",
      "2026-09-27T09:45:37Z WARN  api-gateway: upstream payment-api 5xx rate 34.2% (threshold 2%)",
      "2026-09-27T09:46:10Z INFO  pagerduty: page fired ONC-9912 → payments-oncall",
      "2026-09-27T09:47:05Z WARN  payment-api: retry storm detected: 412 req/s retrying, backoff cap hit",
      "2026-09-27T09:51:44Z ERROR payment-api: db.pool exhausted, circuit breaker OPEN",
    ],
    createdAt: minutesAgo(38),
  },
  {
    id: "INC-2040",
    title: "API latency spike across Order Service",
    service: "Order Service",
    severity: "high",
    status: "identified",
    errorMessage: "upstream response time exceeded 3s p99 SLO (observed 4.8s)",
    description:
      "Order checkout p99 latency breached the 3s SLO after a batch job began scanning the orders table without an index. Root cause identified: missing composite index on (customer_id, created_at) added by migration 118.",
    logs: [
      "2026-09-27T07:58:03Z WARN  order-service: p99 latency 3.4s (SLO 3.0s) endpoint=GET /orders",
      "2026-09-27T08:02:41Z WARN  order-service: p99 latency 4.8s (SLO 3.0s) endpoint=GET /orders",
      "2026-09-27T08:03:10Z INFO  order-service: slow query log: seq scan on orders rows=48,201,337 dur=6122ms",
      "2026-09-27T08:05:22Z INFO  datadog: monitor 'order-p99' triggered → #orders-oncall",
      "2026-09-27T08:12:55Z INFO  order-service: migration 118 applied: ADD INDEX idx_orders_customer_created",
    ],
    createdAt: minutesAgo(137),
  },
  {
    id: "INC-2039",
    title: "Authentication failure burst from edge proxies",
    service: "Authentication Service",
    severity: "critical",
    status: "resolved",
    errorMessage: "JWT validation error: signature verification failed (kid not found in JWKS cache)",
    description:
      "Edge proxies rejected valid tokens after a key rotation raced with the JWKS cache refresh window. Roughly 11 minutes of failed logins for ~4% of users.",
    logs: [
      "2026-09-27T05:31:00Z INFO  auth-service: starting JWKS rotation (kid 2026-Q3-b)",
      "2026-09-27T05:31:47Z ERROR auth-service: JWT validation error: signature verification failed (kid not found in JWKS cache)",
      "2026-09-27T05:32:20Z ERROR auth-service: auth failure rate 18.4% (baseline 0.2%)",
      "2026-09-27T05:38:12Z INFO  auth-service: cache warm override applied, JWKS refreshed kid 2026-Q3-b",
      "2026-09-27T05:42:09Z INFO  auth-service: failure rate 0.4% — recovered",
    ],
    createdAt: minutesAgo(284),
    resolvedAt: minutesAgo(273),
    resolutionMinutes: 11,
  },
  {
    id: "INC-2038",
    title: "Memory leak in Notification Service workers",
    service: "Notification Service",
    severity: "medium",
    status: "resolved",
    errorMessage: "OOMKilled: container exceeded 512Mi memory limit (worker pod notify-worker-7)",
    description:
      "A templating cache grew unbounded on fan-out jobs with large recipient lists. Workers were recycled by Kubernetes; long-term fix ships a cache bound.",
    logs: [
      "2026-09-26T21:14:32Z WARN  kubelet: memory usage 92% of limit pod=notify-worker-7",
      "2026-09-26T21:22:10Z ERROR kubelet: OOMKilled pod=notify-worker-7 container=worker",
      "2026-09-26T21:22:14Z INFO  k8s: restart #3 pod=notify-worker-7",
      "2026-09-26T22:40:51Z INFO  notify-worker: cache bound merged in release 2026.09.26-2240",
    ],
    createdAt: daysAgo(1),
    resolvedAt: daysAgo(0.8),
    resolutionMinutes: 265,
  },
  {
    id: "INC-2037",
    title: "Redis connection failure on session store",
    service: "Authentication Service",
    severity: "high",
    status: "resolved",
    errorMessage: "Redis: max number of clients reached (ERR max number of clients reached)",
    description:
      "Stale connections from leaked sockets exhausted the Redis maxclients limit; sessions were served from the read replica with degraded latency.",
    logs: [
      "2026-09-25T16:03:11Z ERROR redis: max number of clients reached",
      "2026-09-25T16:03:40Z WARN  auth-service: falling back to replica session reads",
      "2026-09-25T16:19:05Z INFO  sre: conntrack table flushed, stale sockets cleared",
      "2026-09-25T16:24:33Z INFO  redis: client count back to 1,204 (limit 10,000)",
    ],
    createdAt: daysAgo(2),
    resolvedAt: daysAgo(2) /* approx */,
    resolutionMinutes: 27,
  },
  {
    id: "INC-2036",
    title: "Deployment failure on API Gateway canary",
    service: "API Gateway",
    severity: "low",
    status: "resolved",
    errorMessage: "canary analysis failed: error rate 1.8% > 1.0% threshold (config schema drift)",
    description:
      "Canary for gateway release 2026.35 rejected due to schema drift between the route config CRD versions. Rollback executed automatically by the deploy pipeline.",
    logs: [
      "2026-09-24T11:02:00Z INFO  deploy-bot: canary 5% rollout started release=2026.35",
      "2026-09-24T11:09:41Z ERROR deploy-bot: canary analysis failed: error rate 1.8% > 1.0%",
      "2026-09-24T11:10:02Z INFO  deploy-bot: automatic rollback completed",
    ],
    createdAt: daysAgo(3),
    resolvedAt: daysAgo(3),
    resolutionMinutes: 9,
  },
];

export function getIncident(id: string): Incident | undefined {
  return incidents.find((i) => i.id === id);
}

export const investigationBundles: Record<string, InvestigationBundle> = {
  "INC-2041": {
    incidentId: "INC-2041",
    analyzed: true,
    analysisSummary:
      "Timing correlates the 09:42 payment-api rollout with immediate pool exhaustion. Error signature matches a 2025-11 post-mortem where a longer-lived transaction pattern saturated the 40-slot pool. The retry storm amplifies saturation; circuit breaker opened at 09:51.",
    hypotheses: [
      {
        id: "hyp-1",
        statement:
          "New release introduced longer-held DB transactions, exhausting the 40-connection pool under normal load.",
        confidence: 78,
        evidence: [
          "Pool saturation begins 33s after the 09:42 rollout completes (deploy-bot log).",
          "active=40 idle=0 with acquire waits >5s — classic hold-time saturation, not a capacity cliff.",
          "Error signature identical to INC-1188 (2025-11-04, payment pool exhaustion post-migration).",
        ],
      },
      {
        id: "hyp-2",
        statement: "Database host degradation (10.0.4.12) causing slow acks and connection pile-up.",
        confidence: 34,
        evidence: [
          "Host CPU/mem nominal in the demo monitoring snapshot.",
          "Does not explain tight timing correlation with the rollout.",
        ],
      },
      {
        id: "hyp-3",
        statement: "Retry storm is the primary cause rather than a symptom.",
        confidence: 12,
        evidence: ["Retry storm begins 90s after first pool timeout; ordering contradicts primacy."],
      },
    ],
    resolutionSteps: [
      {
        id: "step-1",
        order: 1,
        action: "Roll back payment-api release 2026.09.27-0942",
        detail:
          "helm rollback payment-api to previous revision. Same action resolved INC-1188 in 14 minutes.",
      },
      {
        id: "step-2",
        order: 2,
        action: "Raise pool ceiling temporarily (40 → 60) and cap retry backoff",
        detail: "Buys headroom while rollback propagates; prevents breaker flapping.",
      },
      {
        id: "step-3",
        order: 3,
        action: "Verify checkout 5xx rate < 0.5% for 10 consecutive minutes",
        detail: "Dashboards: payments-auth-success, db-pool-saturation.",
      },
      {
        id: "step-4",
        order: 4,
        action: "Profile transaction hold times in staging before re-release",
        detail: "Add integration test asserting pool headroom under synthetic checkout load.",
      },
    ],
    runbook: {
      id: "rb-014",
      name: "Payment DB pool exhaustion — rollback & recover",
      matchedIncident: "INC-1188",
      lastUsed: "2025-11-04T14:02:00Z",
      successRate: 92,
      steps: [
        "Confirm pool metrics: active=limit, wait p95 > 1s",
        "Check latest release within 30 min before onset",
        "helm rollback payment-api <revision>",
        "Watch 5xx rate and pool saturation for 10 min",
        "File follow-up ticket for transaction-hold regression",
      ],
    },
    similarIncidents: [
      {
        id: "INC-1188",
        title: "Payment API pool exhaustion after migration",
        service: "Payment API",
        severity: "critical",
        occurredAt: "2025-11-04T09:20:00Z",
        similarity: 94,
        rootCause: "Migration introduced longer-lived transactions; pool of 40 saturated.",
        resolution: "Rollback + pool ceiling raise; permanent fix in release 2025.46.",
      },
      {
        id: "INC-1203",
        title: "Checkout 504s during retry storm",
        service: "Payment API",
        severity: "high",
        occurredAt: "2025-12-19T18:44:00Z",
        similarity: 71,
        rootCause: "Client retries without jitter amplified transient pool waits.",
        resolution: "Backoff caps + jitter enabled; 5xx rate normalized in 22 min.",
      },
      {
        id: "INC-0954",
        title: "DB failover caused brief connection storm",
        service: "Database",
        severity: "high",
        occurredAt: "2025-07-08T03:12:00Z",
        similarity: 58,
        rootCause: "Failover opened a connection thundering herd.",
        resolution: "PgBouncer queue added ahead of writer.",
      },
    ],
    evidence: [
      {
        id: "ev-1",
        label: "Deploy completes 33s before first pool timeout",
        source: "deploy-bot log · 09:41:58Z vs first WARN 09:42:31Z",
        detail: "Temporal adjacency within one pool-refresh interval; consistent with rollout cause.",
      },
      {
        id: "ev-2",
        label: "Pool state: active=40 idle=0, acquire p95 > 5s",
        source: "payment-api WARN · 09:42:31Z",
        detail: "Saturation pattern, not host failure: no connection refused, only timeouts.",
      },
      {
        id: "ev-3",
        label: "Signature match with INC-1188",
        source: "Historical incident index (demo corpus)",
        detail: "Same OperationalError text and pool metrics from the 2025-11 event.",
      },
    ],
    timeline: [
      { id: "tl-1", label: "Incident detected", detail: "Synthetic monitor: checkout 5xx alarm", timestamp: minutesAgo(38), actor: "monitor" },
      { id: "tl-2", label: "Paged payments-oncall", detail: "PagerDuty ONC-9912", timestamp: minutesAgo(33), actor: "system" },
      { id: "tl-3", label: "Incident declared SEV-1", detail: "Affects all checkout traffic", timestamp: minutesAgo(31), actor: "engineer" },
      { id: "tl-4", label: "Investigation started in IncidentIQ", detail: "Analysis + recall queued", timestamp: minutesAgo(28), actor: "agent" },
      { id: "tl-5", label: "Correlation found: release 2026.09.27-0942", detail: "Demo analysis — pending verification", timestamp: minutesAgo(24), actor: "agent" },
      { id: "tl-6", label: "Runbook RB-014 suggested", detail: "Matches INC-1188 resolution path", timestamp: minutesAgo(22), actor: "agent" },
    ],
  },
};

/** Default bundle for any incident without a curated demo investigation. */
export function getInvestigation(incident: Incident): InvestigationBundle {
  const curated = investigationBundles[incident.id];
  if (curated) return curated;
  return {
    incidentId: incident.id,
    analyzed: false,
    analysisSummary: "",
    hypotheses: [],
    resolutionSteps: [],
    runbook: null,
    similarIncidents: [],
    evidence: [],
    timeline: [
      {
        id: "tl-0",
        label: "Incident recorded",
        detail: "Awaiting investigation — connect the analysis backend to populate this timeline.",
        timestamp: incident.createdAt,
        actor: "system",
      },
    ],
  };
}

export const memoryEntries: MemoryEntry[] = [
  {
    id: "mem-001",
    kind: "root-cause",
    title: "Long-lived transactions saturate 40-slot DB pools",
    service: "Payment API",
    summary:
      "Recurring pattern: transaction hold-time regressions exhaust the pool within minutes. Detection: active=limit + acquire p95 > 1s. Verified across INC-1188 and INC-2041 (demo corpus).",
    retainedAt: "2025-11-05T10:00:00Z",
    source: "post-mortem",
    relevance: 96,
    recallCount: 7,
  },
  {
    id: "mem-002",
    kind: "runbook",
    title: "RB-014 · Payment DB pool exhaustion — rollback & recover",
    service: "Payment API",
    summary:
      "5-step rollback playbook. Used 3 times, 92% success. Fastest recovery: 11 minutes (2025-11-04).",
    retainedAt: "2025-11-06T09:30:00Z",
    source: "resolution",
    relevance: 91,
    recallCount: 3,
  },
  {
    id: "mem-003",
    kind: "incident",
    title: "INC-1188 · Payment API pool exhaustion after migration",
    service: "Payment API",
    summary: "SEV-1, 42 min end-to-end. Root cause: migration 224 hold-time regression.",
    retainedAt: "2025-11-04T15:12:00Z",
    source: "post-mortem",
    relevance: 94,
    recallCount: 9,
  },
  {
    id: "mem-004",
    kind: "resolution",
    title: "JWKS rotation race — warm-cache override",
    service: "Authentication Service",
    summary:
      "Key rotation must warm the JWKS cache before cutover. Override procedure documented after INC-2039.",
    retainedAt: "2026-09-27T06:20:00Z",
    source: "resolution",
    relevance: 88,
    recallCount: 2,
  },
  {
    id: "mem-005",
    kind: "post-mortem",
    title: "Post-mortem: auth failure burst (JWT kid race)",
    service: "Authentication Service",
    summary:
      "11-minute auth outage for 4% of users. Lesson: rotation job must verify cache warmth with a canary token check before switching kids.",
    retainedAt: "2026-09-27T08:00:00Z",
    source: "post-mortem",
    relevance: 85,
    recallCount: 1,
  },
  {
    id: "mem-006",
    kind: "root-cause",
    title: "Unbounded in-process caches behind fan-out jobs",
    service: "Notification Service",
    summary: "Template cache grew unbounded with large recipient lists → OOMKills. Fix: cache bound.",
    retainedAt: "2026-09-26T23:30:00Z",
    source: "post-mortem",
    relevance: 79,
    recallCount: 2,
  },
];

export const postMortems: PostMortem[] = [
  {
    id: "PM-0032",
    incidentId: "INC-2039",
    title: "Auth failure burst — JWKS rotation race",
    service: "Authentication Service",
    severity: "critical",
    status: "retained",
    summary:
      "A scheduled JWKS rotation replaced the signing key before edge proxies refreshed their cache, causing valid tokens to fail verification for ~11 minutes.",
    impact:
      "~4% of users failed login attempts for 11 minutes. No data loss. Support tickets: 31. Checkout unaffected (separate token audience).",
    durationMinutes: 11,
    rootCause:
      "Rotation job switched the active kid while the edge JWKS caches still held the previous keyset, with no warmth-verification step between switch and cutover.",
    resolution:
      "Manual cache warm override pushed the new kid to all edge proxies; rotation job patched to verify cache warmth before cutover.",
    whatWorked: [
      "Failure-rate alarm paged within 90 seconds of onset.",
      "Fallback to replica session reads prevented a full logout event.",
      "On-call identified the rotation correlation quickly.",
    ],
    whatDidNotWork: [
      "Rotation job had no canary verification before switching the active kid.",
      "JWKS cache TTL (15 min) exceeded the rotation cutover window.",
      "Runbook for key rotation lacked a cache-warmth checklist item.",
    ],
    lessonsLearned: [
      "Any key/service cutover needs a canary verification step before full switch.",
      "Cache TTLs must be shorter than the fastest rotation cadence they serve.",
      "Auth failure-rate alarm threshold (5%) was too high; lowered to 2%.",
    ],
    runbookUsed: "RB-021 · JWT key rotation",
    timeline: [
      { id: "tlm-1", label: "Rotation begins", detail: "kid 2026-Q3-b generated", timestamp: "2026-09-27T05:31:00Z", actor: "system" },
      { id: "tlm-2", label: "Edge caches diverge", detail: "Signatures rejected on old-cached JWKS", timestamp: "2026-09-27T05:31:47Z", actor: "monitor" },
      { id: "tlm-3", label: "Alarm paged auth-oncall", detail: "Failure rate 18.4%", timestamp: "2026-09-27T05:32:20Z", actor: "system" },
      { id: "tlm-4", label: "Cache warm override applied", timestamp: "2026-09-27T05:38:12Z", actor: "engineer" },
      { id: "tlm-5", label: "Recovered", detail: "Failure rate 0.4%", timestamp: "2026-09-27T05:42:09Z", actor: "monitor" },
    ],
    createdAt: "2026-09-27T08:00:00Z",
    retainedToHindsight: false,
  },
  {
    id: "PM-0031",
    incidentId: "INC-2038",
    title: "Notification worker OOM — unbounded template cache",
    service: "Notification Service",
    severity: "medium",
    status: "published",
    summary:
      "Fan-out jobs with large recipient lists grew the in-process template cache without bound until pods hit their 512Mi limit and were OOMKilled.",
    impact:
      "Notification delivery delayed up to 40 minutes for batch campaigns. No loss — queue redelivered. 7 pod restarts across 3 hours.",
    durationMinutes: 265,
    rootCause:
      "Template cache keyed by campaign ID with no eviction; large campaigns cached full rendered payloads.",
    resolution: "Shipped cache bound (LRU, 200 entries) and lowered worker memory limit alerts.",
    whatWorked: ["K8s OOMKill restarts kept the queue moving.", "Queue redelivery prevented message loss."],
    whatDidNotWork: ["No memory-growth alarm on workers.", "Load tests used small recipient lists only."],
    lessonsLearned: [
      "Every in-process cache needs a documented bound.",
      "Load tests must include largest realistic fan-out size.",
    ],
    runbookUsed: "RB-009 · Worker OOM triage",
    timeline: [
      { id: "tlp-1", label: "Memory alarm 92%", timestamp: "2026-09-26T21:14:32Z", actor: "monitor" },
      { id: "tlp-2", label: "First OOMKill", timestamp: "2026-09-26T21:22:10Z", actor: "system" },
      { id: "tlp-3", label: "Cache-bound fix merged", timestamp: "2026-09-26T22:40:51Z", actor: "engineer" },
    ],
    createdAt: "2026-09-26T23:30:00Z",
    retainedToHindsight: false,
  },
];

/** Post-mortems are addressed by their incident id in URLs. */
export function getPostMortem(incidentId: string): PostMortem | undefined {
  return postMortems.find((p) => p.incidentId === incidentId);
}
