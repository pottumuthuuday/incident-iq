/**
 * Shared formatting + styling helpers.
 */

export type ClassValue = string | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "3h 12m ago" style relative time, computed against `now`. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const diffMs = now - new Date(iso).getTime();
  const past = diffMs >= 0;
  const minutes = Math.floor(Math.abs(diffMs) / 60_000);

  let label: string;
  if (minutes < 1) label = "just now";
  else if (minutes < 60) label = `${minutes}m`;
  else if (minutes < 60 * 24) label = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  else label = `${Math.floor(minutes / (60 * 24))}d ${Math.floor((minutes % (60 * 24)) / 60)}h`;

  if (label === "just now") return label;
  return past ? `${label} ago` : `in ${label}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export const severityStyles: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 ring-1 ring-red-500/40",
  high: "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/40",
  medium: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/40",
  low: "bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/40",
};

export const severityDot: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-400",
  low: "bg-sky-400",
};

export const statusStyles: Record<string, string> = {
  investigating: "bg-red-500/10 text-red-300 ring-1 ring-red-500/30",
  identified: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30",
  monitoring: "bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/30",
  resolved: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30",
};

export const statusLabel: Record<string, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

export const severityLabel: Record<string, string> = {
  critical: "SEV-1 · Critical",
  high: "SEV-2 · High",
  medium: "SEV-3 · Medium",
  low: "SEV-4 · Low",
};
