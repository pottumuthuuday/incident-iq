import Link from "next/link";
import { WorkflowPipeline } from "@/components/workflow/WorkflowPipeline";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
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

export const dynamic = "force-dynamic";

const now = DEMO_NOW.getTime();

const severityOrder: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
];

/* =========================================================
   STAT CARD
   ========================================================= */

function CommandStat({
  label,
  value,
  description,
  icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  description: string;
  icon: string;
  tone?: "blue" | "red" | "green" | "purple";
}) {
  const tones = {
    blue: "border-sky-400/20 bg-sky-400/[0.04] text-sky-300",
    red: "border-rose-400/20 bg-rose-400/[0.04] text-rose-300",
    green: "border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-300",
    purple: "border-violet-400/20 bg-violet-400/[0.04] text-violet-300",
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.02] ${tones[tone]}`}
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-current opacity-[0.04] blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SEVERITY
   ========================================================= */

function SeverityBreakdown({
  incidents,
}: {
  incidents: Incident[];
}) {
  const counts = severityOrder.map((sev) => ({
    sev,
    count: incidents.filter((i) => i.severity === sev).length,
  }));

  const max = Math.max(...counts.map((c) => c.count), 1);

  return (
    <div className="space-y-4">
      {counts.map(({ sev, count }) => (
        <div key={sev}>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs capitalize text-slate-400">
              {sev}
            </span>

            <span className="font-mono text-xs text-slate-500">
              {count}
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
            <div
              className={`h-full rounded-full ${severityDot[sev]} transition-all`}
              style={{
                width: `${(count / max) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   SERVICES
   ========================================================= */

function ServiceExposure({
  incidents,
}: {
  incidents: Incident[];
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {SERVICES.map((service) => {
        const serviceIncidents = incidents.filter(
          (i) => i.service === service
        );

        const active = serviceIncidents.some(
          (i) => i.status !== "resolved"
        );

        return (
          <div
            key={service}
            className={`rounded-xl border p-3 transition-colors ${
              active
                ? "border-rose-400/20 bg-rose-400/[0.035]"
                : "border-white/[0.06] bg-white/[0.015]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-medium text-slate-200">
                {service}
              </p>

              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  active
                    ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]"
                    : "bg-emerald-400"
                }`}
              />
            </div>

            <p className="mt-1 text-[10px] text-slate-500">
              {serviceIncidents.length === 0
                ? "No incidents"
                : `${serviceIncidents.length} incident${
                    serviceIncidents.length > 1 ? "s" : ""
                  } · 30d`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   INCIDENT ROW
   ========================================================= */

function IncidentRow({
  incident,
}: {
  incident: Incident;
}) {
  return (
    <Link
      href={`/incidents/${incident.id}`}
      className="group block border-b border-white/[0.05] px-5 py-4 last:border-0 hover:bg-white/[0.025]"
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
            incident.severity === "critical"
              ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]"
              : incident.severity === "high"
                ? "bg-orange-400"
                : incident.severity === "medium"
                  ? "bg-amber-400"
                  : "bg-sky-400"
          }`}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-sky-400">
              {incident.id}
            </span>

            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>

          <p className="mt-1.5 truncate text-sm font-medium text-slate-200 group-hover:text-white">
            {incident.title}
          </p>

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
            <span>{incident.service}</span>

            <span>
              {incident.status === "resolved" &&
              incident.resolutionMinutes
                ? `${formatDuration(
                    incident.resolutionMinutes
                  )} resolution`
                : `${formatRelativeTime(
                    incident.createdAt,
                    now
                  )} open`}
            </span>
          </div>
        </div>

        <span className="hidden text-slate-600 transition-transform group-hover:translate-x-1 sm:block">
          →
        </span>
      </div>
    </Link>
  );
}

/* =========================================================
   HINDSIGHT PANEL
   ========================================================= */

function HindsightPanel({
  incidentCount,
}: {
  incidentCount: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.09] via-[#0d1424] to-[#0d1424] p-5">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-lg">
            🧠
          </div>

          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
            Memory Active
          </span>
        </div>

        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/70">
          Hindsight Intelligence
        </p>

        <h3 className="mt-1 text-lg font-semibold text-white">
          Your incidents teach the agent.
        </h3>

        <p className="mt-2 text-xs leading-5 text-slate-400">
          IncidentIQ can recall previous incidents, failed attempts,
          root causes and proven resolutions to improve future
          investigations.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
            <p className="text-xl font-semibold text-white">
              {incidentCount}
            </p>
            <p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-500">
              Incidents
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
            <p className="text-xl font-semibold text-violet-300">
              AI
            </p>
            <p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-500">
              Memory Engine
            </p>
          </div>
        </div>

        <Link
          href="/memory"
          className="mt-4 flex items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-2.5 text-xs font-medium text-violet-200 transition hover:bg-violet-400/15"
        >
          Explore Hindsight Memory →
        </Link>
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

export default function DashboardPage() {
  const incidents = allIncidents();

  const active = incidents.filter(
    (i) => i.status !== "resolved"
  );

  const critical = incidents.filter(
    (i) =>
      i.severity === "critical" &&
      i.status !== "resolved"
  );

  const resolved = incidents.filter(
    (i) => i.status === "resolved"
  );

  const avgResolution = resolved.length
    ? Math.round(
        resolved.reduce(
          (sum, i) => sum + (i.resolutionMinutes ?? 0),
          0
        ) / resolved.length
      )
    : 0;

  return (
    <main className="min-h-screen">
      {/* =====================================================
          TOP COMMAND HEADER
          ===================================================== */}

      <header className="border-b border-white/[0.06] bg-[#070b14]/80 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10">
              <span className="text-sm font-bold text-sky-300">
                IQ
              </span>
            </div>

            <div>
              <p className="text-sm font-semibold tracking-tight text-white">
                INCIDENTIQ
              </p>

              <p className="hidden text-[9px] uppercase tracking-[0.18em] text-slate-500 sm:block">
                AI Incident Command Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-3 py-1.5 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.8)]" />
              <span className="text-[10px] font-medium text-emerald-300">
                SYSTEMS OPERATIONAL
              </span>
            </div>

            <LinkButton href="/incidents/new">
              + New Incident
            </LinkButton>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN
          ===================================================== */}

      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* HERO */}

        <section className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-[#101a2e] via-[#0c1424] to-[#0a101c] p-6 sm:p-8">
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(56,189,248,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.035)_1px,transparent_1px)] [background-size:32px_32px]" />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-sky-300">
                Operations Overview
              </span>

              <DemoBadge />
            </div>

            <div className="mt-5 max-w-2xl">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
                AI Incident
                <span className="text-sky-300">
                  {" "}Command Center
                </span>
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                Monitor incidents, investigate root causes and let
                AI learn from every outage through persistent
                Hindsight memory.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] text-slate-500">
              <span>● {active.length} active incidents</span>
              <span>● {critical.length} critical</span>
              <span>● {resolved.length} resolved</span>
              <span>● Hindsight connected</span>
            </div>
          </div>
        </section>

        {/* WORKFLOW */}

        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Incident lifecycle
            </p>

            <span className="text-[10px] text-slate-600">
              New incident → learned knowledge
            </span>
          </div>

          <WorkflowPipeline />
        </section>

        {/* DEMO NOTICE */}

        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
          <DemoBadge />
          <span>
            Synthetic incidents are used for demonstration.
          </span>
        </div>

        {/* STATS */}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CommandStat
            label="Active incidents"
            value={String(active.length)}
            description="Currently open"
            icon="◉"
            tone="blue"
          />

          <CommandStat
            label="Critical incidents"
            value={String(critical.length)}
            description="Requires attention"
            icon="!"
            tone="red"
          />

          <CommandStat
            label="Resolved"
            value={String(resolved.length)}
            description="Closed with knowledge"
            icon="✓"
            tone="green"
          />

          <CommandStat
            label="Average resolution"
            value={
              avgResolution
                ? formatDuration(avgResolution)
                : "—"
            }
            description="Across resolved incidents"
            icon="◷"
            tone="purple"
          />
        </section>

        {/* MAIN CONTENT */}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.8fr)]">
          {/* INCIDENTS */}

          <Card className="overflow-hidden">
            <CardHeader
              title="Recent incidents"
              subtitle="Select an incident to open its investigation"
            />

            <div className="divide-y divide-white/[0.02]">
              {incidents.length ? (
                incidents.map((incident) => (
                  <IncidentRow
                    key={incident.id}
                    incident={incident}
                  />
                ))
              ) : (
                <div className="p-8 text-center text-sm text-slate-500">
                  No incidents recorded yet.
                </div>
              )}
            </div>
          </Card>

          {/* RIGHT COLUMN */}

          <div className="space-y-5">
            <HindsightPanel
              incidentCount={incidents.length}
            />

            <Card>
              <CardHeader
                title="Incident severity"
                subtitle="Current distribution"
              />

              <CardBody>
                <SeverityBreakdown incidents={incidents} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Affected services"
                subtitle="Service exposure · last 30 days"
              />

              <CardBody>
                <ServiceExposure incidents={incidents} />
              </CardBody>
            </Card>
          </div>
        </section>

        {/* BOTTOM CTA */}

        <section className="rounded-2xl border border-sky-400/10 bg-sky-400/[0.025] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                Ready to investigate a new incident?
              </p>

              <p className="mt-1 text-xs text-slate-500">
                IncidentIQ will analyze the event and search
                Hindsight for relevant historical knowledge.
              </p>
            </div>

            <LinkButton href="/incidents/new">
              + Create Incident
            </LinkButton>
          </div>
        </section>
      </div>
    </main>
  );
}