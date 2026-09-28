"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { INCIDENT_TYPES, SERVICES } from "@/lib/demo-data";
import { createIncident } from "@/lib/api-client";
import type { Severity } from "@/lib/types";

const inputClasses =
  "w-full rounded-lg border border-[#26344f] bg-[#0e1526] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-500/60 focus:outline-none focus:ring-1 focus:ring-sky-500/40";

const labelClasses = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#8b99b5]";

const severityOptions: { value: Severity; label: string; hint: string }[] = [
  { value: "critical", label: "SEV-1 · Critical", hint: "Customer-facing outage or data at risk" },
  { value: "high", label: "SEV-2 · High", hint: "Major functionality degraded" },
  { value: "medium", label: "SEV-3 · Medium", hint: "Partial impact, workaround exists" },
  { value: "low", label: "SEV-4 · Low", hint: "Minor issue, no immediate impact" },
];

export default function NewIncidentPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const logs = String(form.get("logs") ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    try {
      const incident = await createIncident({
        title: String(form.get("title") ?? ""),
        service: String(form.get("service") ?? ""),
        severity: String(form.get("severity") ?? "medium") as Severity,
        errorMessage: String(form.get("errorMessage") ?? ""),
        description: String(form.get("description") ?? ""),
        logs,
        createdAt: new Date().toISOString(),
      });
      // In the foundation build this navigates to the investigation view for the
      // new incident (demo data). The "Start Investigation" step will later
      // trigger analysis + Hindsight recall via the FastAPI backend.
      router.push(`/incidents/${incident.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Incident"
        description="Record the incident, then start the investigation."
      />
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Card>
          <CardHeader
            title="Incident details"
            subtitle="Capture what happened, where, and how bad it is."
          />
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="title" className={labelClasses}>
                  Incident title <span className="text-red-400">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  required
                  placeholder="e.g. Database connection timeout on Payment API"
                  className={inputClasses}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="service" className={labelClasses}>
                    Service <span className="text-red-400">*</span>
                  </label>
                  <select id="service" name="service" required className={inputClasses} defaultValue="">
                    <option value="" disabled>
                      Select a service…
                    </option>
                    {SERVICES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="severity" className={labelClasses}>
                    Severity <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="severity"
                    name="severity"
                    required
                    className={inputClasses}
                    defaultValue="high"
                  >
                    {severityOptions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="errorMessage" className={labelClasses}>
                  Error message <span className="text-red-400">*</span>
                </label>
                <input
                  id="errorMessage"
                  name="errorMessage"
                  required
                  placeholder="e.g. psycopg2.OperationalError: connection timeout expired"
                  className={inputClasses}
                />
              </div>

              <div>
                <label htmlFor="description" className={labelClasses}>
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="What did you observe? Who/what is affected? When did it start?"
                  className={inputClasses}
                />
              </div>

              <div>
                <label htmlFor="logs" className={labelClasses}>
                  Logs <span className="normal-case text-slate-500">(one per line, optional)</span>
                </label>
                <textarea
                  id="logs"
                  name="logs"
                  rows={6}
                  className={`${inputClasses} font-mono text-xs`}
                  placeholder={"2026-09-27T09:42:31Z WARN db.pool acquire wait 5000ms\n2026-09-27T09:43:12Z ERROR connection timeout expired"}
                />
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Tip: include timestamps. The analysis engine uses log timing to correlate with
                  deploys and similar past incidents.
                </p>
              </div>

              <div>
                <label htmlFor="incidentType" className={labelClasses}>
                  Incident type
                </label>
                <select id="incidentType" name="incidentType" className={inputClasses} defaultValue="">
                  <option value="">Optional classification…</option>
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="timestamp" className={labelClasses}>
                  Detected at
                </label>
                <input
                  id="timestamp"
                  name="timestamp"
                  type="datetime-local"
                  className={inputClasses}
                />
              </div>

              {error ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              ) : null}

              <div className="flex items-center justify-between border-t border-[#1e2a44] pt-5">
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Starting an investigation will analyze the incident and recall similar past
                  incidents, causes and runbooks.
                </p>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Starting…" : "🔍 Start Investigation"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
