"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardBody, SectionTitle } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/SeverityBadges";
import { Badge, DemoBadge, NotConnectedBadge } from "@/components/ui/Badge";
import { Timeline } from "@/components/ui/Timeline";
import { Button } from "@/components/ui/Button";
import {
  getPostMortem,
  getIncident,
  getInvestigation,
} from "@/lib/demo-data";
import { formatDuration } from "@/lib/utils";
import type { Incident, InvestigationBundle, PostMortem } from "@/lib/types";

const editableClasses =
  "w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-slate-200 transition-colors hover:border-[#26344f] focus:border-sky-500/60 focus:bg-[#0e1526] focus:outline-none";

const RETAIN_SUCCESS_MESSAGE = "✓ Incident knowledge retained in Hindsight";

/**
 * Build a draft post-mortem from the incident (and its investigation bundle)
 * when no curated post-mortem exists yet. This is what makes
 * "Draft post-mortem →" work for newly created incidents: the editor opens
 * pre-populated with everything already known — including live FastAPI
 * analysis and real Hindsight recall when the analysis backend is up — and
 * the engineer reviews/edits before retaining.
 */
function buildDraftFromIncident(
  incident: Incident,
  investigation: InvestigationBundle
): PostMortem {
  const topHypothesis =
    investigation.hypotheses.length > 0
      ? investigation.hypotheses.reduce((a, b) => (b.confidence > a.confidence ? b : a))
      : null;
  const runbook = investigation.runbook;
  const plannedSteps = investigation.resolutionSteps
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((s) => `${s.order}. ${s.action} — ${s.detail}`);

  const durationMinutes =
    incident.resolutionMinutes ??
    Math.max(
      1,
      Math.round(
        (Date.now() - new Date(incident.createdAt).getTime()) / 60_000
      )
    );

  return {
    id: `draft-${incident.id}`,
    incidentId: incident.id,
    title: `Post-mortem: ${incident.title}`,
    service: incident.service,
    severity: incident.severity,
    status: "draft",
    summary: incident.description,
    impact:
      "Impact assessment pending — describe affected users, traffic, and regions.",
    durationMinutes,
    // Pre-fill with the investigation's leading hypothesis so the engineer
    // reviews a starting point rather than a blank page. Verified cause is
    // still the engineer's responsibility (editable inline below).
    rootCause:
      topHypothesis !== null
        ? `${topHypothesis.statement} [Draft — AI analysis (confidence ${topHypothesis.confidence}%), pending verification]`
        : "",
    resolution:
      plannedSteps.length > 0
        ? plannedSteps.join("\n")
        : "Resolution steps pending — document the actions taken.",
    whatWorked: [],
    whatDidNotWork: [],
    lessonsLearned: [],
    runbookUsed: runbook ? `${runbook.id.toUpperCase()} · ${runbook.name}` : "",
    timeline: investigation.timeline,
    createdAt: new Date().toISOString(),
    retainedToHindsight: false,
  };
}

export default function PostMortemDetailPage() {
  const params = useParams<{ incidentId: string }>();
  const router = useRouter();
  const incidentId = decodeURIComponent(params.incidentId);

  // Resolve the post-mortem client-side: curated demo documents are static,
  // while incidents created through the New Incident form live in the server
  // runtime store and are fetched from /api/incidents/[id]. The investigation
  // bundle (live FastAPI analysis when the backend is up) pre-fills the draft.
  const [pm, setPm] = useState<PostMortem | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Local draft state. In this build there is no document persistence —
  // editing exists so the document can be reviewed like a real draft.
  const [draft, setDraft] = useState<PostMortem | null>(null);
  const [retainState, setRetainState] = useState<
    "idle" | "retaining" | "success" | "error" | "not-configured"
  >("idle");
  const [retainMessage, setRetainMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setNotFound(false);

      // Demo incidents resolve from the static corpus; UI-created ones come
      // from the runtime store via the API.
      let inc: Incident | null = getIncident(incidentId) ?? null;
      if (!inc) {
        try {
          const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}`);
          if (res.ok) {
            const payload = (await res.json().catch(() => null)) as { data?: Incident } | null;
            inc = payload?.data ?? null;
          }
        } catch {
          // treated as not-found below
        }
      }

      const curated = getPostMortem(incidentId) ?? null;
      let nextPm: PostMortem | null = curated;
      if (!curated && inc) {
        // Start from the demo bundle (curated/empty), then prefer the live
        // bundle from the analysis backend when it responds. If the backend
        // is down the demo/empty bundle is used — degradation, not failure.
        let investigation = getInvestigation(inc);
        try {
          const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/analysis`);
          if (res.ok) {
            const payload = (await res.json().catch(() => null)) as {
              data?: { bundle?: InvestigationBundle };
            } | null;
            if (payload?.data?.bundle) investigation = payload.data.bundle;
          }
        } catch {
          // keep demo/empty bundle
        }
        nextPm = buildDraftFromIncident(inc, investigation);
      }

      if (cancelled) return;
      setIncident(inc);
      setPm(nextPm);
      setDraft(nextPm);
      setNotFound(!nextPm);
      setLoading(false);
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[#8b99b5]">Loading post-mortem…</p>
      </div>
    );
  }

  if (!pm || !draft || notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-200">Post-mortem not found</p>
          <p className="mt-1 text-sm text-[#8b99b5]">
            No incident exists with id {incidentId}.
          </p>
          <button
            onClick={() => router.push("/post-mortems")}
            className="mt-4 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            ← All post-mortems
          </button>
        </div>
      </div>
    );
  }

  const isDraftFromIncident = pm.id.startsWith("draft-");

  async function handleRetain() {
    // REAL Hindsight retain.
    //
    // Sends the completed post-mortem to /api/hindsight/retain, which calls
    // Hindsight Cloud server-side (the API key never reaches the browser).
    if (!pm || !draft) return;
    setRetainState("retaining");
    setRetainMessage(null);
    try {
      const res = await fetch("/api/hindsight/retain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: pm.incidentId,
          service: pm.service,
          severity: pm.severity,
          status: incident?.status ?? "resolved",
          description: draft.summary,
          errorDetails: incident?.errorMessage ?? draft.summary,
          rootCause: draft.rootCause,
          resolutionSteps: [draft.resolution],
          resolutionSucceeded: true,
          runbookUsed: draft.runbookUsed,
          resolutionTimeMinutes: pm.durationMinutes,
          whatWorked: draft.whatWorked,
          whatDidNotWork: draft.whatDidNotWork,
          lessonsLearned: draft.lessonsLearned,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const err = payload?.error;
        if (err?.kind === "not-configured") {
          setRetainState("not-configured");
        } else {
          setRetainState("error");
        }
        setRetainMessage(err?.message ?? `Retain failed (HTTP ${res.status})`);
        return;
      }
      setRetainState("success");
      setRetainMessage(RETAIN_SUCCESS_MESSAGE);
    } catch (err) {
      setRetainState("error");
      setRetainMessage(err instanceof Error ? err.message : "Retain request failed");
    }
  }

  const retainedNow = pm.retainedToHindsight || retainState === "success";

  return (
    <div>
      <PageHeader
        title={draft.title}
        description={`${pm.id} · incident ${pm.incidentId} · ${pm.service}`}
        actions={
          <>
            <SeverityBadge severity={pm.severity} />
            {isDraftFromIncident ? (
              <Badge className="bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/30">
                New draft
              </Badge>
            ) : null}
            <Badge
              className={
                retainedNow
                  ? "bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/30"
                  : "bg-slate-500/10 text-slate-300 ring-1 ring-slate-500/30"
              }
            >
              {retainedNow ? "Retained to memory ✓" : "Not retained"}
            </Badge>
          </>
        }
      />

      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <DemoBadge />
          <span>
            Draft content is synthetic demo data. Click any text field to edit inline (draft state
            only). <strong className="mx-1 text-slate-300">Retain to Hindsight performs a real
            retain</strong> against the incidentiq memory bank (requires HINDSIGHT_API_KEY).
          </span>
        </div>

        {/* ---------------- Identity (read-only) ---------------- */}
        <Card>
          <CardBody>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
              <div>
                <dt className="text-xs text-[#8b99b5]">Incident ID</dt>
                <dd className="mt-0.5 font-medium text-slate-200">{pm.incidentId}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#8b99b5]">Incident title</dt>
                <dd className="mt-0.5 font-medium text-slate-200">
                  {incident?.title ?? draft.title}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8b99b5]">Service</dt>
                <dd className="mt-0.5 font-medium text-slate-200">{pm.service}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#8b99b5]">Severity</dt>
                <dd className="mt-0.5"><SeverityBadge severity={pm.severity} /></dd>
              </div>
              <div className="col-span-2 md:col-span-4">
                <dt className="text-xs text-[#8b99b5]">Status</dt>
                <dd className="mt-0.5 font-medium text-slate-200">
                  {isDraftFromIncident
                    ? `Draft — pre-populated from incident ${pm.incidentId}`
                    : pm.status}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        {/* ---------------- Summary + impact ---------------- */}
        <Card>
          <CardHeader title="Incident summary" subtitle={`${formatDuration(pm.durationMinutes)} end-to-end`} />
          <CardBody className="space-y-4">
            <div>
              <SectionTitle>Summary</SectionTitle>
              <textarea
                value={draft.summary}
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                rows={3}
                className={`${editableClasses} mt-1 text-sm leading-relaxed`}
              />
            </div>
            <div>
              <SectionTitle>Business / service impact</SectionTitle>
              <textarea
                value={draft.impact}
                onChange={(e) => setDraft({ ...draft, impact: e.target.value })}
                rows={3}
                className={`${editableClasses} mt-1 text-sm leading-relaxed`}
              />
            </div>
          </CardBody>
        </Card>

        {/* ---------------- Timeline ---------------- */}
        <Card>
          <CardHeader title="Incident timeline" subtitle="Key events from detection to recovery" />
          <CardBody>
            <Timeline events={pm.timeline} />
          </CardBody>
        </Card>

        {/* ---------------- Cause + resolution ---------------- */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="Root cause" />
            <CardBody>
              <textarea
                value={draft.rootCause}
                onChange={(e) => setDraft({ ...draft, rootCause: e.target.value })}
                rows={4}
                className={`${editableClasses} text-sm leading-relaxed`}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Resolution" />
            <CardBody>
              <textarea
                value={draft.resolution}
                onChange={(e) => setDraft({ ...draft, resolution: e.target.value })}
                rows={4}
                className={`${editableClasses} text-sm leading-relaxed`}
              />
            </CardBody>
          </Card>
        </div>

        {/* ---------------- Learnings ---------------- */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="What worked" />
            <CardBody>
              <ul className="space-y-2">
                {draft.whatWorked.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="mt-0.5 text-emerald-400">✓</span> {item}
                  </li>
                ))}
                {draft.whatWorked.length === 0 ? (
                  <li className="text-sm italic text-[#8b99b5]">
                    Nothing recorded yet — add what worked during resolution.
                  </li>
                ) : null}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="What did not work" />
            <CardBody>
              <ul className="space-y-2">
                {draft.whatDidNotWork.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="mt-0.5 text-red-400">✗</span> {item}
                  </li>
                ))}
                {draft.whatDidNotWork.length === 0 ? (
                  <li className="text-sm italic text-[#8b99b5]">
                    Nothing recorded yet — add what did not work.
                  </li>
                ) : null}
              </ul>
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="Lessons learned" />
            <CardBody>
              <ul className="space-y-2">
                {draft.lessonsLearned.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="mt-0.5 text-sky-400">→</span> {item}
                  </li>
                ))}
                {draft.lessonsLearned.length === 0 ? (
                  <li className="text-sm italic text-[#8b99b5]">
                    Nothing recorded yet — add lessons learned.
                  </li>
                ) : null}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Runbook used" />
            <CardBody>
              {draft.runbookUsed ? (
                <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-sm font-medium text-emerald-300">
                  {draft.runbookUsed}
                </p>
              ) : (
                <p className="rounded-lg border border-dashed border-[#2a3a5c] bg-[#0e1526]/60 p-3 text-sm italic text-[#8b99b5]">
                  No runbook linked for this incident.
                </p>
              )}
              <p className="mt-2 text-xs text-[#8b99b5]">
                The runbook and its outcome will be linked in memory when this document is retained.
              </p>
            </CardBody>
          </Card>
        </div>

        {/* ---------------- Retain action ---------------- */}
        <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5">
          <CardBody className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  Retain this post-mortem to Hindsight
                </p>
                <p className="mt-0.5 text-xs text-[#8b99b5]">
                  Stores summary, root cause, resolution, what worked / didn&apos;t, lessons and the
                  runbook outcome — so the next similar incident resolves faster.
                </p>
              </div>
              <Button
                variant="retain"
                onClick={handleRetain}
                disabled={retainState === "retaining" || retainState === "success"}
              >
                {retainState === "retaining"
                  ? "Retaining…"
                  : retainState === "success"
                    ? "✓ Retained"
                    : "🧠 Retain to Hindsight"}
              </Button>
            </div>
            {retainState === "success" ? (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                {retainMessage ?? RETAIN_SUCCESS_MESSAGE}
              </p>
            ) : null}
            {retainState === "error" ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                <strong>Retain failed.</strong> {retainMessage} Nothing was written to Hindsight.
              </p>
            ) : null}
            {retainState === "not-configured" ? (
              <p className="rounded-lg border border-dashed border-[#2a3a5c] bg-[#0e1526]/60 px-3 py-2 text-sm text-[#8b99b5]">
                <strong className="text-slate-300">Hindsight not configured.</strong> {retainMessage}{" "}
                Add HINDSIGHT_API_KEY to .env.local (see .env.example) and restart the dev server.
              </p>
            ) : null}
            {retainState === "idle" ? (
              <div className="flex items-start gap-2 rounded-lg border border-dashed border-[#2a3a5c] bg-[#0e1526]/60 p-3">
                <NotConnectedBadge />
                <p className="text-[11px] leading-relaxed text-[#8b99b5]">
                  This button performs a real retain against Hindsight Cloud (memory bank
                  "incidentiq"). If the API key is missing or the call fails, you will see a clear
                  error — nothing is ever faked.
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="flex items-center justify-between pb-2">
          <Link
            href="/post-mortems"
            className="text-xs text-slate-400 transition-colors hover:text-sky-300"
          >
            ← All post-mortems
          </Link>
          <Link
            href={`/incidents/${pm.incidentId}`}
            className="text-xs text-slate-400 transition-colors hover:text-sky-300"
          >
            View incident {pm.incidentId} →
          </Link>
        </div>
      </div>
    </div>
  );
}
