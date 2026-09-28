import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge, DemoBadge, NotConnectedBadge } from "@/components/ui/Badge";
import { MemoryEntryRow, HindsightPendingPanel } from "@/components/memory/MemorySections";
import { WorkflowPipeline } from "@/components/workflow/WorkflowPipeline";
import { HindsightRecallPanel } from "@/components/hindsight/HindsightRecallPanel";
import { memoryEntries } from "@/lib/demo-data";
import { getHindsightStatus, HINDSIGHT_BANK_ID } from "@/lib/hindsight";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Hindsight Memory page — backed by the REAL Hindsight Cloud memory bank.
 *
 * - Status banner / sidebar reflect a live getVersion() call (cached 30s).
 * - "Live memory (Hindsight recall)" queries the real bank server-side and
 *   distinguishes "no memories found" from "connection failed".
 * - The demo corpus below is clearly labeled synthetic UI data for the layout;
 *   it is never presented as Hindsight output.
 */
export default async function MemoryPage() {
  const status = await getHindsightStatus();

  const counts = {
    incidents: memoryEntries.filter((m) => m.kind === "incident").length,
    causes: memoryEntries.filter((m) => m.kind === "root-cause").length,
    resolutions: memoryEntries.filter((m) => m.kind === "resolution").length,
    runbooks: memoryEntries.filter((m) => m.kind === "runbook").length,
    postMortems: memoryEntries.filter((m) => m.kind === "post-mortem").length,
  };

  return (
    <div>
      <PageHeader
        title="Hindsight Memory"
        description={`Organizational memory bank "${HINDSIGHT_BANK_ID}" — incidents, causes, resolutions, runbooks and post-mortems.`}
        actions={
          status.connected ? (
            <Badge className="bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30">
              Connected{status.apiVersion ? ` · API ${status.apiVersion}` : ""}
            </Badge>
          ) : (
            <NotConnectedBadge />
          )
        }
      />
      <div className="space-y-5 p-6">
        {/* ---------------- Live status banner ---------------- */}
        <div
          className={`rounded-xl border p-4 ${
            status.connected
              ? "border-emerald-500/25 bg-emerald-500/5"
              : "border-dashed border-[#2a3a5c] bg-[#0e1526]/60"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg">🧠</span>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {status.connected
                    ? "Hindsight Cloud connected"
                    : status.configured
                      ? "Hindsight connection failed"
                      : "Hindsight Cloud not configured"}
                </p>
                <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-[#8b99b5]">
                  {status.connected
                    ? `Recall and reflect run live against memory bank "${status.bankId}". Retain post-mortems to grow this memory.`
                    : status.message}
                </p>
              </div>
            </div>
            <Badge
              className={
                status.connected
                  ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
                  : "border border-dashed border-slate-500/40 bg-slate-500/10 uppercase text-slate-400"
              }
            >
              {status.connected ? "Live" : "Not connected"}
            </Badge>
          </div>
        </div>

        <WorkflowPipeline />

        {/* ---------------- Real recall from the bank ---------------- */}
        <Card>
          <CardHeader
            title="Live memory (Hindsight recall)"
            subtitle="Real recall results from your memory bank — try any query about past incidents"
            actions={<DemoBadge />}
          />
          <CardBody>
            <HindsightRecallPanel />
          </CardBody>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader
              title="Memory corpus (demo layout data)"
              subtitle="Synthetic reference corpus showing the intended structure — not Hindsight output"
              actions={<DemoBadge />}
            />
            <CardBody className="space-y-2.5">
              {memoryEntries.map((m) => (
                <MemoryEntryRow key={m.id} entry={m} />
              ))}
            </CardBody>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader title="How recall works" subtitle="The query IncidentIQ sends" />
              <CardBody className="space-y-3">
                <div className="rounded-lg border border-[#1e2a44] bg-[#0e1526] p-3 font-mono text-xs text-slate-400">
                  <p className="text-sky-400">hindsight.recall(&quot;incidentiq&quot;, query)</p>
                  <p className="pl-4">types: world · experience · observation</p>
                  <p className="pl-4">prefer_observations: true</p>
                  <p className="pl-4">budget: mid · max_tokens: 4096</p>
                </div>
                <HindsightPendingPanel
                  title="Server-side only"
                  description="HINDSIGHT_API_KEY stays on the server. The browser calls /api/hindsight/* route handlers, which perform the real Hindsight calls."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Memory health (demo)" subtitle="Corpus quality indicators" />
              <CardBody className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#8b99b5]">Retention coverage</span>
                  <span className="font-medium text-slate-200">83% of resolved incidents</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8b99b5]">Runbooks with &gt;80% success</span>
                  <span className="font-medium text-slate-200">2 of 3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8b99b5]">Avg recall relevance</span>
                  <span className="font-medium text-slate-200">89%</span>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* ---------------- Memory Timeline (demo history) ---------------- */}
        <Card>
          <CardHeader
            title="Memory Timeline"
            subtitle="How IncidentIQ accumulates knowledge over time — demo retention history shown; new retains appear here as they happen"
            actions={<DemoBadge />}
          />
          <CardBody>
            <MemoryTimeline />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">Complete the learning loop</p>
              <p className="text-xs text-[#8b99b5]">
                Post-mortems feed this memory. Finish an unresolved one and retain it.
              </p>
            </div>
            <Badge className="bg-[#0e1526] text-slate-300 ring-1 ring-[#1e2a44]">
              Next: Post-Mortems → Retain to Hindsight
            </Badge>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function MemoryTimeline() {
  const sorted = [...memoryEntries].sort(
    (a, b) => new Date(a.retainedAt).getTime() - new Date(b.retainedAt).getTime()
  );
  return (
    <ol className="relative space-y-6 border-l border-[#1e2a44] pl-6">
      {sorted.map((m) => (
        <li key={m.id} className="relative">
          <span
            className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-[#111a2e] ${
              m.kind === "post-mortem"
                ? "bg-violet-400"
                : m.kind === "runbook"
                  ? "bg-amber-400"
                  : m.kind === "root-cause"
                    ? "bg-red-400"
                    : m.kind === "resolution"
                      ? "bg-emerald-400"
                      : "bg-sky-400"
            }`}
          />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-slate-100">{m.title}</p>
            <time className="font-mono text-[11px] text-[#8b99b5]">
              {formatRelativeTime(m.retainedAt)}
            </time>
          </div>
          <p className="mt-0.5 text-xs text-[#8b99b5]">{m.summary}</p>
          <Badge className="mt-1.5 bg-[#0e1526] text-slate-400 ring-1 ring-[#1e2a44]">
            {m.kind.replace("-", " ")} · {m.source.replace("-", " ")}
          </Badge>
        </li>
      ))}
    </ol>
  );
}
