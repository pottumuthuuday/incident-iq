import { formatDateTime } from "@/lib/utils";
import type { TimelineEvent } from "@/lib/types";

const actorStyles: Record<TimelineEvent["actor"], { dot: string; label: string }> = {
  monitor: { dot: "bg-sky-400", label: "Monitor" },
  engineer: { dot: "bg-emerald-400", label: "Engineer" },
  agent: { dot: "bg-violet-400", label: "Agent" },
  system: { dot: "bg-slate-400", label: "System" },
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-[#8b99b5]">No events recorded yet.</p>;
  }
  return (
    <ol className="relative space-y-5 border-l border-[#1e2a44] pl-5">
      {events.map((e) => {
        const actor = actorStyles[e.actor];
        return (
          <li key={e.id} className="relative">
            <span
              className={`absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-[#111a2e] ${actor.dot}`}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-sm font-medium text-slate-100">{e.label}</p>
              <time className="font-mono text-[11px] text-[#8b99b5]">
                {formatDateTime(e.timestamp)}
              </time>
            </div>
            {e.detail ? <p className="mt-0.5 text-xs text-[#8b99b5]">{e.detail}</p> : null}
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {actor.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
