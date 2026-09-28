import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { SeverityBadge, StatusBadge } from "@/components/ui/SeverityBadges";
import { LinkButton } from "@/components/ui/Button";
import { DemoBadge } from "@/components/ui/Badge";
import { DEMO_NOW } from "@/lib/demo-data";
import { allIncidents } from "@/lib/incident-store";
import { formatRelativeTime, formatDuration } from "@/lib/utils";
import type { IncidentStatus } from "@/lib/types";

// Reads the runtime incident store — must render per request.
export const dynamic = "force-dynamic";

const filters: { key: "all" | IncidentStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "investigating", label: "Investigating" },
  { key: "identified", label: "Identified" },
  { key: "monitoring", label: "Monitoring" },
  { key: "resolved", label: "Resolved" },
];

export default function IncidentsPage() {
  // Runtime-created incidents (New Incident form) first, then demo data.
  const incidents = allIncidents();
  const counts = Object.fromEntries(
    filters.map((f) => [
      f.key,
      f.key === "all" ? incidents.length : incidents.filter((i) => i.status === f.key).length,
    ])
  );
  const now = DEMO_NOW.getTime();

  return (
    <div>
      <PageHeader
        title="Incidents"
        description="Every recorded incident across your services."
        actions={<LinkButton href="/incidents/new">＋ New Incident</LinkButton>}
      />
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <DemoBadge />
          <span>Synthetic incident data for UI demonstration.</span>
        </div>

        <Card>
          <CardHeader
            title="All incidents"
            subtitle={`${incidents.length} incidents · newest first`}
          />
          {/* Filter pills — static demo of the status filter UX */}
          <div className="flex flex-wrap gap-2 border-b border-[#1e2a44] px-5 py-3">
            {filters.map((f) => (
              <span
                key={f.key}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  f.key === "all"
                    ? "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30"
                    : "bg-[#0e1526] text-slate-400 ring-1 ring-[#1e2a44]"
                }`}
              >
                {f.label} · {counts[f.key]}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#1e2a44] text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-2.5 font-semibold">Incident</th>
                  <th className="px-5 py-2.5 font-semibold">Severity</th>
                  <th className="px-5 py-2.5 font-semibold">Service</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5 font-semibold">Opened</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((i) => (
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
                    <td className="px-5 py-3 font-mono text-xs text-[#8b99b5]">
                      {formatRelativeTime(i.createdAt, now)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-[#8b99b5]">
                      {i.resolutionMinutes ? formatDuration(i.resolutionMinutes) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
