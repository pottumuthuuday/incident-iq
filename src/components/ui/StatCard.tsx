import { Card } from "./Card";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "critical" | "warning" | "positive";
  icon?: React.ReactNode;
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, { ring: string; value: string }> = {
  default: { ring: "border-[#1e2a44]", value: "text-slate-100" },
  critical: { ring: "border-red-500/30", value: "text-red-400" },
  warning: { ring: "border-amber-500/30", value: "text-amber-300" },
  positive: { ring: "border-emerald-500/30", value: "text-emerald-300" },
};

export function StatCard({ label, value, hint, tone = "default", icon }: StatCardProps) {
  const t = toneStyles[tone];
  return (
    <Card className={`border ${t.ring}`}>
      <div className="flex items-start justify-between px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8b99b5]">
            {label}
          </p>
          <p className={`mt-2 text-3xl font-semibold tracking-tight ${t.value}`}>{value}</p>
          {hint ? <p className="mt-1 text-xs text-[#8b99b5]">{hint}</p> : null}
        </div>
        {icon ? <div className="text-xl text-slate-500">{icon}</div> : null}
      </div>
    </Card>
  );
}
