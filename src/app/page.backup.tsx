import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkflowPipeline } from "@/components/workflow/WorkflowPipeline";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { SeverityBadge, StatusBadge } from "@/components/ui/SeverityBadges";
import { LinkButton } from "@/components/ui/Button";
import { DemoBadge } from "@/components/ui/Badge";
import { DEMO_NOW, SERVICES } from "@/lib/demo-data";
import { allIncidents } from "@/lib/incident-store";
import {
  formatRelativeTime,
  formatDuration,
  severityDot,
} from "@/lib/utils";
import type { Incident, Severity } from "@/lib/types";

// Reads the runtime incident store — must render per request.
export const dynamic = "force-dynamic";

const now = DEMO_NOW.getTime();

const severityOrder: Severity[] = ["critical", "high", "medium", "low"];

function SeverityBreakdown({ incidents }: { incidents: Incident[] }) {
  const counts = severityOrder.map((sev) => ({
    sev,
    count: incidents.filter((i) => i.severity === sev).length,
  }));
  const max = Math.max(...counts.map((c) => c.count), 1);
  return (
    <div className="space-y-2.5">
      {counts.map(({ sev, count }) => (
        <div key={sev} className="flex items-center gap-3">
          <span className="w-20 text-xs capitalize text-slate-300">{sev}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#0e1526]">
            <div
              className={`h-full rounded-full ${severityDot[sev]}`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="w-6 text-right text-xs font-semibold text-slate-200">{count}</span>
        </div>
      ))}
    </div>
  );
}

function ServiceExposure({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SERVICES.map((svc) => {
        const svcIncidents = incidents.filter((i) => i.service === svc);
        const hasActive = svcIncidents.some((i) => i.status !== "resolved");
        return (
          <div
            key={svc}
            className={`rounded-lg border p-2.5 ${
              hasActive ? "border-red-500/30 bg-red-500/5" : "border-[#1e2a44] bg-[#0e1526]"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="truncate text-xs font-medium text-slate-200">{svc}</p>
              {hasActive ? (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              ) : (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/70" />
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-[#8b99b5]">
              {svcIncidents.length === 0
                ? "No incidents"
                : `${svcIncidents.length} incident${svcIncidents.length > 1 ? "s" : ""} · 30d`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function RecentIncidentsTable({ rows }: { rows: Incident[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#1e2a44] text-[11px] uppercase tracking-wider text-slate-500">
            <th className="px-5 py-2.5 font-semibold">Incident</th>
            <th className="px-5 py-2.5 font-semibold">Severity</th>
            <th className="px-5 py-2.5 font-semibold">Service</th>
            <th className="px-5 py-2.5 font-semibold">Status</th>
            <th className="px-5 py-2.5 text-right font-semibold">Elapsed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.id} className="border-b border-[#141d33] last:border-0 hover:bg-[#0e1526]">
              <td className="px-5 py-3">
                <Link href={`/incidents/${i.id}`} className="group block">
                  <p className="font-mono text-xs text-sky-400 group-hover:text-sky-300">{i.id}</p>
                  <p className="mt-0.5 text-[13px] font-medium text-slate-200 group-hover:text-white">
                    {i.title}
                  </p>
                </Link>
              </td>
              <td className="px-5 py-3"><SeverityBadge severity={i.severity} /></td>
              <td className="px-5 py-3 text-[13px] text-slate-300">{i.service}</td>
              <td className="px-5 py-3"><StatusBadge status={i.status} /></td>
              <td className="px-5 py-3 text-right font-mono text-xs text-[#8b99b5]">
                {i.status === "resolved" && i.resolutionMinutes
                  ? `${formatDuration(i.resolutionMinutes)} (resolved)`
                  : `${formatRelativeTime(i.createdAt, now)} (open)`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  // Runtime-created incidents (New Incident form) first, then demo data.
  const incidents = allIncidents();

  const active = incidents.filter((i) => i.status !== "resolved");
  const critical = incidents.filter(
    (i) => i.severity === "critical" && i.status !== "resolved"
  );
  const resolved = incidents.filter((i) => i.status === "resolved");
  const avgResolution = resolved.length
    ? Math.round(resolved.reduce((sum, i) => sum + (i.resolutionMinutes ?? 0), 0) / resolved.length)
    : 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Real-time operational view of incidents across your services."
        actions={<LinkButton href="/incidents/new">＋ New Incident</LinkButton>}
      />
      <div className="space-y-5 p-6">
        <WorkflowPipeline />

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <DemoBadge />
          <span>All figures on this page render from synthetic demo data for UI demonstration.</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active incidents" value={String(active.length)} hint="Currently open" tone="warning" />
          <StatCard label="Critical incidents" value={String(critical.length)} hint="SEV-1 · needs attention" tone="critical" />
          <StatCard label="Resolved (30d)" value={String(resolved.length)} hint="Closed with post-mortems" tone="positive" />
          <StatCard
            label="Avg resolution time"
            value={avgResolution ? formatDuration(avgResolution) : "—"}
            hint="Across resolved incidents"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader
              title="Recent incidents"
              subtitle="Newest first — click an incident to open its investigation"
            />
            <RecentIncidentsTable rows={incidents} />
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Incident severity" subtitle="All recorded incidents" />
              <CardBody>
                <SeverityBreakdown incidents={incidents} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Affected services" subtitle="Service exposure · last 30 days" />
              <CardBody>
                <ServiceExposure incidents={incidents} />
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
