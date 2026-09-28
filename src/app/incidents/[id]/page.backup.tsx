import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { formatDuration, formatRelativeTime, severityLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

function LiveBadge() {
  return (
    <Badge className="border border-emerald-500/40 bg-emerald-500/10 uppercase text-emerald-300">
      Live analysis
    </Badge>
  );
}

/** Honesty marker per section: live > demo > not-connected. */
function SectionBadge({ live, count }: { live: boolean; count: number }) {
  if (live && count > 0) return <LiveBadge />;
  if (count > 0) return <DemoBadge />;
  return <NotConnectedBadge />;
}

export default async function InvestigationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Resolves UI-created incidents (runtime store) and demo incidents alike.
  const incident = findIncident(decodeURIComponent(id));
  if (!incident) notFound();

  const now = DEMO_NOW.getTime();
  const loaded = await loadInvestigation(incident);
  const bundle = loaded.bundle;
  const live = loaded.live;
  const source: "demo" | "live" = live ? "live" : "demo";

  return (
    <div>
      <PageHeader
        title={incident.title}
        description={`${incident.id} · ${incident.service}`}
        actions={
          <>
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </>
        }
      />

      <div className="space-y-5 p-6">
        {live ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <LiveBadge />
            <span>
              Analysis sections below are generated live by the FastAPI analysis agent, grounded in
              real recall from the Hindsight Cloud memory bank. The incident record itself is
              synthetic.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <DemoBadge />
            <span>
              Incident record is synthetic; sections marked &quot;Demo data&quot; show example
              output. The
              <strong className="mx-1 text-slate-300">🧠 Hindsight Memory</strong>section below shows
              real recall from the Hindsight Cloud memory bank (requires HINDSIGHT_API_KEY in
              .env.local).
            </span>
          </div>
        )}

        {/* ---------------- Overview row ---------------- */}
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Incident summary" subtitle="What happened, reported by the reporter" />
            <CardBody className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-300">{incident.description}</p>
              <div>
                <SectionTitle>Error details</SectionTitle>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-red-500/20 bg-red-500/5 px-3.5 py-3 font-mono text-xs text-red-300">
                  {incident.errorMessage}
                </pre>
              </div>
              <div>
                <SectionTitle>Logs</SectionTitle>
                <div className="mt-2">
                  <LogViewer logs={incident.logs} />
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Service information" />
              <CardBody className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#8b99b5]">Service</span>
                  <span className="font-medium text-slate-200">{incident.service}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8b99b5]">Severity</span>
                  <span className="font-medium text-slate-200">
                    {severityLabel[incident.severity]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8b99b5]">Status</span>
                  <StatusBadge status={incident.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8b99b5]">Opened</span>
                  <span className="font-mono text-xs text-slate-300">
                    {formatRelativeTime(incident.createdAt, now)}
                  </span>
                </div>
                {incident.resolvedAt ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[#8b99b5]">Time to resolve</span>
                    <span className="font-mono text-xs text-emerald-300">
                      {formatDuration(incident.resolutionMinutes ?? 0)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-[#8b99b5]">Time elapsed</span>
                    <span className="font-mono text-xs text-amber-300">
                      {formatRelativeTime(incident.createdAt, now)}
                    </span>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="AI analysis"
                subtitle="Automated analysis engine"
                actions={live ? <LiveBadge /> : <NotConnectedBadge />}
              />
              <CardBody className="space-y-3">
                {live ? (
                  <>
                    <p className="font-mono text-[11px] uppercase tracking-wide text-emerald-300/90">
                      {loaded.meta?.generatedBy} · {loaded.meta?.memoryCount} hindsight memories
                      recalled
                    </p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">
                      {bundle.analysisSummary}
                    </p>
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
                          ? `${loaded.note ?? "The analysis backend is reachable but returned no usable analysis."} Demo or empty states are shown below instead.`
                          : `${loaded.backendMessage ?? ""} Start the FastAPI service (ANALYSIS_API_URL, default http://127.0.0.1:8000 — see .env.example) to run live analysis.`
                      }
                    />
                    {bundle.analyzed ? (
                      <p className="text-sm leading-relaxed text-slate-300">
                        {bundle.analysisSummary}
                      </p>
                    ) : (
                      <p className="text-sm text-[#8b99b5]">
                        No analysis available for this incident yet.
                      </p>
                    )}
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </div>

        {/* ---------------- 🧠 Hindsight Memory (real recall + reflect) ---------------- */}
        <HindsightInvestigation incident={incident} />

        {/* ---------------- Timeline ---------------- */}
        <Card>
          <CardHeader
            title="Timeline"
            subtitle="Detection, escalation and investigation milestones"
          />
          <CardBody>
            <Timeline events={bundle.timeline} />
          </CardBody>
        </Card>

        {/* ---------------- AI recommendation row ---------------- */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader
              title="Root cause analysis"
              subtitle="Ranked hypotheses with supporting evidence"
              actions={<SectionBadge live={live} count={bundle.hypotheses.length} />}
            />
            <CardBody>
              <RootCauseSection hypotheses={bundle.hypotheses} source={source} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Recommended resolution"
              subtitle="Ordered remediation steps from matched history"
              actions={<SectionBadge live={live} count={bundle.resolutionSteps.length} />}
            />
            <CardBody>
              {bundle.resolutionSteps.length === 0 ? (
                <p className="text-sm text-[#8b99b5]">
                  {live
                    ? "The analysis agent returned no resolution steps."
                    : "Resolution steps appear here once the analysis engine and Hindsight recall are connected."}
                </p>
              ) : (
                <ol className="space-y-3">
                  {bundle.resolutionSteps.map((s) => (
                    <li key={s.id} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-xs font-bold text-sky-300 ring-1 ring-sky-500/40">
                        {s.order}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-100">{s.action}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#8b99b5]">{s.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              <div className="mt-5 border-t border-[#1e2a44] pt-4">
                <SectionTitle>Recommended runbook</SectionTitle>
                {bundle.runbook ? (
                  <div className="mt-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-emerald-300">{bundle.runbook.name}</p>
                      <Badge className="bg-emerald-500/15 text-emerald-300">
                        {bundle.runbook.matchedIncident
                          ? `${bundle.runbook.successRate}% success · ${bundle.runbook.matchedIncident}`
                          : `${bundle.runbook.successRate}% success`}
                      </Badge>
                    </div>
                    <ol className="mt-2.5 list-decimal space-y-1 pl-4 text-xs text-slate-300">
                      {bundle.runbook.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                    <p className="mt-2 text-[11px] text-slate-500">
                      {live
                        ? `Sourced from Hindsight memory${bundle.runbook.matchedIncident ? ` (incident ${bundle.runbook.matchedIncident})` : ""}`
                        : `Last used ${formatRelativeTime(bundle.runbook.lastUsed, now)} · demo content`}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[#8b99b5]">
                    {live
                      ? "No runbook matched in the recalled memories for this incident."
                      : "No runbook matched yet — recall is not connected."}
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* ---------------- Recall + evidence row ---------------- */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader
              title="Similar incidents"
              subtitle="Recalled from organizational memory"
              actions={<SectionBadge live={live} count={bundle.similarIncidents.length} />}
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
              actions={<SectionBadge live={live} count={bundle.evidence.length} />}
            />
            <CardBody>
              {bundle.evidence.length === 0 ? (
                <p className="text-sm text-[#8b99b5]">
                  {live
                    ? "The analysis agent returned no evidence items."
                    : "Evidence chains appear here once analysis is connected."}
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {bundle.evidence.map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-lg border border-[#1e2a44] bg-[#0e1526] p-3.5"
                    >
                      <p className="text-sm font-medium text-slate-100">{ev.label}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-sky-400/80">{ev.source}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#8b99b5]">{ev.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ---------------- Next step ---------------- */}
        <Card className="border-violet-500/25">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">Incident resolved?</p>
              <p className="text-xs text-[#8b99b5]">
                Write the post-mortem, then retain the learnings to memory.
              </p>
            </div>
            <Link
              href={`/post-mortems/${bundle.incidentId}`}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Draft post-mortem →
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
