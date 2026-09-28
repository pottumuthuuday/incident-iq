import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/SeverityBadges";
import { Badge, DemoBadge } from "@/components/ui/Badge";
import { postMortems } from "@/lib/demo-data";
import { formatDuration, formatRelativeTime } from "@/lib/utils";
import { DEMO_NOW } from "@/lib/demo-data";

const statusStyles: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-300 ring-1 ring-slate-500/30",
  published: "bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/30",
  retained: "bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/30",
};

export default function PostMortemsPage() {
  const now = DEMO_NOW.getTime();
  return (
    <div>
      <PageHeader
        title="Post-Mortems"
        description="Blameless analyses that feed organizational memory."
      />
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <DemoBadge />
          <span>Synthetic post-mortem data for UI demonstration.</span>
        </div>

        <Card>
          <CardHeader title="All post-mortems" subtitle={`${postMortems.length} documents`} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#1e2a44] text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-2.5 font-semibold">Post-mortem</th>
                  <th className="px-5 py-2.5 font-semibold">Incident</th>
                  <th className="px-5 py-2.5 font-semibold">Severity</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Memory</th>
                </tr>
              </thead>
              <tbody>
                {postMortems.map((pm) => (
                  <tr key={pm.id} className="border-b border-[#141d33] last:border-0 hover:bg-[#0e1526]">
                    <td className="px-5 py-3">
                      <Link href={`/post-mortems/${pm.incidentId}`} className="group block">
                        <p className="font-mono text-xs text-sky-400 group-hover:text-sky-300">{pm.id}</p>
                        <p className="mt-0.5 text-[13px] font-medium text-slate-200 group-hover:text-white">
                          {pm.title}
                        </p>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/incidents/${pm.incidentId}`}
                        className="font-mono text-xs text-slate-400 hover:text-sky-300"
                      >
                        {pm.incidentId}
                      </Link>
                      <p className="text-[11px] text-slate-500">{pm.service}</p>
                    </td>
                    <td className="px-5 py-3"><SeverityBadge severity={pm.severity} /></td>
                    <td className="px-5 py-3">
                      <Badge className={statusStyles[pm.status]}>{pm.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {pm.retainedToHindsight ? (
                        <Badge className="bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/30">
                          Retained ✓
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-500">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#1e2a44] px-5 py-3 text-[11px] text-slate-500">
            Retained post-mortems have been persisted to organizational memory (demo marker — real
            Hindsight retention arrives with the integration).
          </div>
        </Card>

        <p className="text-xs text-slate-500">
          Drafted {formatRelativeTime(postMortems[postMortems.length - 1].createdAt, now)} · durations
          shown on each document.
        </p>
      </div>
    </div>
  );
}
