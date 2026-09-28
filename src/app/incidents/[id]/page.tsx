import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardHeader, CardBody, SectionTitle } from "@/components/ui/Card";
import { SeverityBadge, StatusBadge } from "@/components/ui/SeverityBadges";
import { Badge, DemoBadge, NotConnectedBadge } from "@/components/ui/Badge";
import { Timeline } from "@/components/ui/Timeline";
import { LogViewer } from "@/components/ui/LogViewer";

import {
  SimilarIncidentsSection,
  RootCauseSection,
  HindsightPendingPanel,
} from "@/components/memory/MemorySections";

import { HindsightInvestigation } from "@/components/hindsight/HindsightInvestigation";

import { DEMO_NOW } from "@/lib/demo-data";
import { findIncident } from "@/lib/incident-store";
import { loadInvestigation } from "@/lib/investigation-loader";
import {
  formatDuration,
  formatRelativeTime,
  severityLabel,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

/* =========================================================
   STATUS BADGES
   ========================================================= */

function LiveBadge() {
  return (
    <Badge className="border border-emerald-400/20 bg-emerald-400/10 uppercase tracking-wider text-emerald-300">
      ● Live analysis
    </Badge>
  );
}

function SectionBadge({
  live,
  count,
}: {
  live: boolean;
  count: number;
}) {
  if (live && count > 0) return <LiveBadge />;
  if (count > 0) return <DemoBadge />;
  return <NotConnectedBadge />;
}

/* =========================================================
   COMMAND METRIC
   ========================================================= */

function CommandMetric({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: string;
  tone?: "blue" | "red" | "green" | "purple";
}) {
  const colors = {
    blue: "border-sky-400/15 bg-sky-400/[0.04] text-sky-300",
    red: "border-rose-400/15 bg-rose-400/[0.04] text-rose-300",
    green: "border-emerald-400/15 bg-emerald-400/[0.04] text-emerald-300",
    purple: "border-violet-400/15 bg-violet-400/[0.04] text-violet-300",
  };

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${colors[tone]}`}
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   PAGE
   ========================================================= */

export default async function InvestigationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const incident = findIncident(decodeURIComponent(id));

  if (!incident) {
    notFound();
  }

  const now = DEMO_NOW.getTime();

  const loaded = await loadInvestigation(incident);

  const bundle = loaded.bundle;
  const live = loaded.live;

  const source: "demo" | "live" = live ? "live" : "demo";

  return (
    <main className="min-h-screen">
      {/* =====================================================
          TOP BAR
          ===================================================== */}

      <header className="border-b border-white/[0.06] bg-[#070b14]/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10">
              <span className="text-xs font-bold text-sky-300">
                IQ
              </span>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                INCIDENTIQ
              </p>

              <p className="hidden text-[9px] uppercase tracking-[0.18em] text-slate-500 sm:block">
                AI Incident Command Center
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {live ? <LiveBadge /> : <DemoBadge />}

            <Link
              href="/"
              className="hidden rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.06] hover:text-white sm:block"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* ===================================================
            INCIDENT HERO
            =================================================== */}

        <section className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-[#121c30] via-[#0c1424] to-[#090f1b] p-6 sm:p-8">
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(56,189,248,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.035)_1px,transparent_1px)] [background-size:32px_32px]" />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] font-medium text-sky-400">
                {incident.id}
              </span>

              <SeverityBadge severity={incident.severity} />

              <StatusBadge status={incident.status} />
            </div>

            <div className="mt-5 max-w-4xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Active Investigation
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
                {incident.title}
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                {incident.service} · AI-assisted investigation
                grounded in incident evidence and persistent
                organizational memory.
              </p>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <CommandMetric
                label="Service"
                value={incident.service}
                tone="blue"
              />

              <CommandMetric
                label="Severity"
                value={severityLabel[incident.severity]}
                tone="red"
              />

              <CommandMetric
                label="Status"
                value={incident.status}
                tone="green"
              />

              <CommandMetric
                label="Opened"
                value={formatRelativeTime(
                  incident.createdAt,
                  now
                )}
                tone="purple"
              />
            </div>
          </div>
        </section>

        {/* ===================================================
            SOURCE NOTICE
            =================================================== */}

        {live ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.035] p-4">
            <span className="mt-0.5 text-emerald-300">●</span>

            <div>
              <p className="text-xs font-semibold text-emerald-200">
                Live AI investigation
              </p>

              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Analysis below is generated by the FastAPI
                analysis agent and grounded in recalled Hindsight
                Cloud memories. The incident record itself is
                synthetic.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-violet-400/15 bg-violet-400/[0.03] p-4">
            <span className="mt-0.5 text-violet-300">🧠</span>

            <div>
              <p className="text-xs font-semibold text-violet-200">
                Hindsight memory enabled
              </p>

              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Demo sections may contain example data, while the
                Hindsight Memory section can show real recalled
                organizational knowledge when the Hindsight API
                key is configured.
              </p>
            </div>
          </div>
        )}

        {/* ===================================================
            INCIDENT SIGNALS + AI ANALYSIS
            =================================================== */}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(330px,0.7fr)]">
          {/* INCIDENT SIGNALS */}

          <Card>
            <CardHeader
              title="Incident signals"
              subtitle="Evidence reported by the incident source"
            />

            <CardBody className="space-y-5">
              <div>
                <SectionTitle>
                  Incident description
                </SectionTitle>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {incident.description}
                </p>
              </div>

              <div>
                <SectionTitle>
                  Error signature
                </SectionTitle>

                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl border border-rose-400/15 bg-rose-400/[0.035] p-4 font-mono text-xs leading-5 text-rose-300">
                  {incident.errorMessage}
                </pre>
              </div>

              <div>
                <SectionTitle>
                  Runtime logs
                </SectionTitle>

                <div className="mt-2">
                  <LogViewer logs={incident.logs} />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* AI ANALYSIS */}

          <Card className="border-sky-400/15">
            <CardHeader
              title="AI investigation"
              subtitle="Automated reasoning engine"
              actions={
                live ? <LiveBadge /> : <NotConnectedBadge />
              }
            />

            <CardBody className="space-y-4">
              {live ? (
                <>
                  <div className="rounded-xl border border-sky-400/10 bg-sky-400/[0.035] p-4">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-sky-300">
                      Memory context
                    </p>

                    <p className="mt-2 text-xs font-medium text-slate-200">
                      {loaded.meta?.generatedBy}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-500">
                      {loaded.meta?.memoryCount ?? 0} Hindsight
                      memories recalled
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      AI assessment
                    </p>

                    <p className="whitespace-pre-line text-sm leading-6 text-slate-300">
                      {bundle.analysisSummary}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <HindsightPendingPanel
                    title={
                      loaded.backendAvailable
                        ? "Live analysis unavailable"
                        : "Analysis backend not connected"
                    }
                    description={
                      loaded.backendAvailable
                        ? `${
                            loaded.note ??
                            "The analysis backend is reachable but returned no usable analysis."
                          } Demo or empty states are shown below instead.`
                        : `${
                            loaded.backendMessage ?? ""
                          } Start the FastAPI service (ANALYSIS_API_URL, default http://127.0.0.1:8000) to run live analysis.`
                    }
                  />

                  {bundle.analyzed ? (
                    <p className="text-sm leading-6 text-slate-300">
                      {bundle.analysisSummary}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No analysis available for this incident
                      yet.
                    </p>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </section>

        {/* ===================================================
            HINDSIGHT MEMORY — THE STAR
            =================================================== */}

        <section className="relative">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">
                Memory intelligence
              </p>

              <h2 className="mt-1 text-lg font-semibold text-white">
                What did IncidentIQ learn from the past?
              </h2>
            </div>

            <Link
              href="/memory"
              className="text-xs text-violet-300 transition hover:text-violet-200"
            >
              Explore all memory →
            </Link>
          </div>

          <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.06] via-[#0d1424] to-[#0b101c] p-1">
            <div className="rounded-xl">
              <HindsightInvestigation incident={incident} />
            </div>
          </div>
        </section>

        {/* ===================================================
            TIMELINE
            =================================================== */}

        <Card>
          <CardHeader
            title="Investigation timeline"
            subtitle="Detection, escalation and investigation milestones"
          />

          <CardBody>
            <Timeline events={bundle.timeline} />
          </CardBody>
        </Card>

        {/* ===================================================
            ROOT CAUSE + RESOLUTION
            =================================================== */}

        <section className="grid gap-5 xl:grid-cols-2">
          {/* ROOT CAUSE */}

          <Card>
            <CardHeader
              title="AI root cause"
              subtitle="Ranked hypotheses with supporting evidence"
              actions={
                <SectionBadge
                  live={live}
                  count={bundle.hypotheses.length}
                />
              }
            />

            <CardBody>
              <RootCauseSection
                hypotheses={bundle.hypotheses}
                source={source}
              />
            </CardBody>
          </Card>

          {/* RESOLUTION */}

          <Card>
            <CardHeader
              title="Recommended resolution"
              subtitle="Remediation steps informed by matched history"
              actions={
                <SectionBadge
                  live={live}
                  count={bundle.resolutionSteps.length}
                />
              }
            />

            <CardBody>
              {bundle.resolutionSteps.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {live
                    ? "The analysis agent returned no resolution steps."
                    : "Resolution steps appear here once the analysis engine and Hindsight recall are connected."}
                </p>
              ) : (
                <ol className="space-y-4">
                  {bundle.resolutionSteps.map((step) => (
                    <li
                      key={step.id}
                      className="flex gap-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/10 text-xs font-bold text-sky-300">
                        {step.order}
                      </span>

                      <div>
                        <p className="text-sm font-medium text-slate-100">
                          {step.action}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {step.detail}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              <div className="mt-6 border-t border-white/[0.06] pt-5">
                <SectionTitle>
                  Recommended runbook
                </SectionTitle>

                {bundle.runbook ? (
                  <div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.035] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-emerald-300">
                        {bundle.runbook.name}
                      </p>

                      <Badge className="bg-emerald-400/10 text-emerald-300">
                        {bundle.runbook.matchedIncident
                          ? `${bundle.runbook.successRate}% success · ${bundle.runbook.matchedIncident}`
                          : `${bundle.runbook.successRate}% success`}
                      </Badge>
                    </div>

                    <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-xs leading-5 text-slate-300">
                      {bundle.runbook.steps.map(
                        (step, index) => (
                          <li key={index}>{step}</li>
                        )
                      )}
                    </ol>

                    <p className="mt-3 text-[10px] text-slate-600">
                      {live
                        ? `Sourced from Hindsight memory${
                            bundle.runbook.matchedIncident
                              ? ` · incident ${bundle.runbook.matchedIncident}`
                              : ""
                          }`
                        : `Last used ${formatRelativeTime(
                            bundle.runbook.lastUsed,
                            now
                          )} · demo content`}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    {live
                      ? "No runbook matched in the recalled memories for this incident."
                      : "No runbook matched yet — recall is not connected."}
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </section>

        {/* ===================================================
            SIMILAR INCIDENTS + EVIDENCE
            =================================================== */}

        <section className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader
              title="Similar incidents"
              subtitle="Recalled from organizational memory"
              actions={
                <SectionBadge
                  live={live}
                  count={bundle.similarIncidents.length}
                />
              }
            />

            <CardBody>
              <SimilarIncidentsSection
                incidents={bundle.similarIncidents}
                source={source}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Evidence & reasoning"
              subtitle="Signals behind the current hypotheses"
              actions={
                <SectionBadge
                  live={live}
                  count={bundle.evidence.length}
                />
              }
            />

            <CardBody>
              {bundle.evidence.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {live
                    ? "The analysis agent returned no evidence items."
                    : "Evidence chains appear here once analysis is connected."}
                </p>
              ) : (
                <ul className="space-y-3">
                  {bundle.evidence.map((evidence) => (
                    <li
                      key={evidence.id}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4"
                    >
                      <p className="text-sm font-medium text-slate-100">
                        {evidence.label}
                      </p>

                      <p className="mt-1 font-mono text-[10px] text-sky-400/80">
                        {evidence.source}
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {evidence.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </section>

        {/* ===================================================
            RESOLUTION → POST MORTEM
            =================================================== */}

        <section className="relative overflow-hidden rounded-2xl border border-violet-400/15 bg-gradient-to-r from-violet-500/[0.06] to-fuchsia-500/[0.025] p-5 sm:p-6">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🧠</span>

                <p className="text-sm font-semibold text-white">
                  Turn this incident into organizational knowledge
                </p>
              </div>

              <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500">
                Once resolved, create the post-mortem and retain
                the lessons so IncidentIQ can recall them during
                future incidents.
              </p>
            </div>

            <Link
              href={`/post-mortems/${bundle.incidentId}`}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-violet-500/10 transition hover:opacity-90"
            >
              Draft post-mortem →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}