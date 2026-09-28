import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Explicit marker so no demo content is ever mistaken for real/Hindsight data. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge
      className={cn(
        "border border-dashed border-violet-500/40 bg-violet-500/10 uppercase text-violet-300",
        className
      )}
    >
      Demo data
    </Badge>
  );
}

export function NotConnectedBadge({ className }: { className?: string }) {
  return (
    <Badge
      className={cn(
        "border border-dashed border-slate-500/40 bg-slate-500/10 uppercase text-slate-400",
        className
      )}
    >
      Not connected
    </Badge>
  );
}
