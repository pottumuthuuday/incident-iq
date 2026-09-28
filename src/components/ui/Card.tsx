import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#1e2a44] bg-[#111a2e] shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  actions,
  icon,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#1e2a44] px-5 py-4">
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-0.5 text-slate-400">{icon}</div> : null}
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-100">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-[#8b99b5]">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8b99b5]">
      {children}
    </h3>
  );
}
