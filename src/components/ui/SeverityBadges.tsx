import {
  severityDot,
  severityLabel,
  severityStyles,
  statusLabel,
  statusStyles,
} from "@/lib/utils";
import type { IncidentStatus, Severity } from "@/lib/types";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${severityStyles[severity]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${severityDot[severity]}`} />
      {severityLabel[severity]}
    </span>
  );
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${statusStyles[status]}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {status === "investigating" ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
        ) : null}
        <span
          className={
            status === "investigating"
              ? "relative inline-flex h-1.5 w-1.5 rounded-full bg-red-400"
              : "relative inline-flex h-1.5 w-1.5 rounded-full bg-current opacity-80"
          }
        />
      </span>
      {statusLabel[status]}
    </span>
  );
}
