import { formatDateTime } from "@/lib/utils";
import type { TimelineEvent } from "@/lib/types";

const actorStyles: Record<
  TimelineEvent["actor"],
  { dot: string; label: string }
> = {
  monitor: {
    dot: "bg-sky-400",
    label: "Monitor",
  },
  engineer: {
    dot: "bg-emerald-400",
    label: "Engineer",
  },
  agent: {
    dot: "bg-violet-400",
    label: "Agent",
  },
  system: {
    dot: "bg-slate-400",
    label: "System",
  },
};

const workflow = [
  {
    number: "01",
    title: "Incident detected",
    description: "Capture the incident signal, service and severity.",
    tone: "sky",
  },
  {
    number: "02",
    title: "Evidence analyzed",
    description: "Inspect error signatures, logs and service signals.",
    tone: "blue",
  },
  {
    number: "03",
    title: "Hindsight recalled",
    description: "Search retained incidents, fixes and lessons.",
    tone: "violet",
  },
  {
    number: "04",
    title: "Root cause identified",
    description: "Connect current evidence with historical patterns.",
    tone: "purple",
  },
  {
    number: "05",
    title: "Resolution recommended",
    description: "Apply proven remediation from organizational memory.",
    tone: "emerald",
  },
  {
    number: "06",
    title: "Knowledge retained",
    description: "Post-mortem learnings become future memory.",
    tone: "fuchsia",
  },
];

const workflowTone: Record<
  string,
  {
    border: string;
    bg: string;
    number: string;
    dot: string;
  }
> = {
  sky: {
    border: "border-sky-400/15",
    bg: "bg-sky-400/[0.035]",
    number: "bg-sky-400/10 text-sky-300",
    dot: "bg-sky-400",
  },
  blue: {
    border: "border-blue-400/15",
    bg: "bg-blue-400/[0.035]",
    number: "bg-blue-400/10 text-blue-300",
    dot: "bg-blue-400",
  },
  violet: {
    border: "border-violet-400/15",
    bg: "bg-violet-400/[0.035]",
    number: "bg-violet-400/10 text-violet-300",
    dot: "bg-violet-400",
  },
  purple: {
    border: "border-purple-400/15",
    bg: "bg-purple-400/[0.035]",
    number: "bg-purple-400/10 text-purple-300",
    dot: "bg-purple-400",
  },
  emerald: {
    border: "border-emerald-400/15",
    bg: "bg-emerald-400/[0.035]",
    number: "bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  fuchsia: {
    border: "border-fuchsia-400/15",
    bg: "bg-fuchsia-400/[0.035]",
    number: "bg-fuchsia-400/10 text-fuchsia-300",
    dot: "bg-fuchsia-400",
  },
};

function InvestigationWorkflow() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.025] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-lg">
            🧠
          </div>

          <div>
            <p className="text-xs font-semibold text-violet-200">
              Investigation workflow
            </p>

            <p className="mt-1 text-[10px] leading-5 text-slate-500">
              These are the stages IncidentIQ can use during an
              investigation. Recorded events will appear here when
              the incident timeline contains them.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {workflow.map((step) => {
          const tone = workflowTone[step.tone];

          return (
            <div
              key={step.number}
              className={`rounded-xl border ${tone.border} ${tone.bg} p-4`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-[9px] font-bold ${tone.number}`}
                >
                  {step.number}
                </span>

                <span
                  className={`h-1.5 w-1.5 rounded-full ${tone.dot}`}
                />

                <p className="text-xs font-semibold text-slate-200">
                  {step.title}
                </p>
              </div>

              <p className="mt-3 text-[10px] leading-4 text-slate-500">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Timeline({
  events,
}: {
  events: TimelineEvent[];
}) {
  if (events.length === 0) {
    return <InvestigationWorkflow />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-sky-300">
            Recorded activity
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {events.length} investigation event
            {events.length === 1 ? "" : "s"} recorded
          </p>
        </div>

        <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
          Live timeline
        </span>
      </div>

      <ol className="relative space-y-6 border-l border-white/[0.08] pl-6">
        {events.map((e) => {
          const actor = actorStyles[e.actor];

          return (
            <li
              key={e.id}
              className="relative"
            >
              <span
                className={`absolute -left-[30px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[#111a2e] ${actor.dot}`}
              />

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 transition hover:border-white/[0.1]">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">
                    {e.label}
                  </p>

                  <time className="font-mono text-[10px] text-slate-600">
                    {formatDateTime(e.timestamp)}
                  </time>
                </div>

                {e.detail ? (
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {e.detail}
                  </p>
                ) : null}

                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${actor.dot}`}
                  />

                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {actor.label}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}