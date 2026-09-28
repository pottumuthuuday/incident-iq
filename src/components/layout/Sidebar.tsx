"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useHindsightStatus } from "@/lib/useHindsightStatus";

const nav = [
  {
    section: "Operations",
    items: [
      { href: "/", label: "Dashboard", icon: "grid" },
      { href: "/incidents", label: "Incidents", icon: "alert" },
      { href: "/incidents/new", label: "New Incident", icon: "plus" },
    ],
  },
  {
    section: "Knowledge",
    items: [
      { href: "/memory", label: "Hindsight Memory", icon: "brain" },
      { href: "/post-mortems", label: "Post-Mortems", icon: "doc" },
    ],
  },
] as const;

function NavIcon({ name }: { name: string }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "alert":
      return (
        <svg {...common}>
          <path d="M12 9v4" /><path d="M12 17h.01" />
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "brain":
      return (
        <svg {...common}>
          <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
          <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
          <path d="M12 5v13" />
        </svg>
      );
    case "doc":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
      );
    default:
      return null;
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const hindsightStatus = useHindsightStatus();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-[#1e2a44] bg-[#0e1526]">
      <div className="flex items-center gap-2.5 px-5 py-[18px]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-600 shadow-[0_0_16px_rgba(56,189,248,0.35)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M13 2 4.5 12.5H11L9.5 22 19 10h-6.5L13 2Z" fill="white" stroke="none" />
          </svg>
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight text-white">IncidentIQ</p>
          <p className="text-[10px] text-[#8b99b5]">AI Incident Response</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {nav.map((group) => (
          <div key={group.section}>
            <p className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {group.section}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      (item.href === "/incidents" && pathname.startsWith("/incidents") && pathname !== "/incidents/new") ||
                      (item.href === "/incidents/new" && pathname === "/incidents/new") ||
                      (item.href === "/memory" && pathname.startsWith("/memory")) ||
                      (item.href === "/post-mortems" && pathname.startsWith("/post-mortems"));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/25"
                          : "text-slate-400 hover:bg-[#16203a] hover:text-slate-200"
                      )}
                    >
                      <NavIcon name={item.icon} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#1e2a44] p-4">
        <div className="rounded-lg border border-[#1e2a44] bg-[#111a2e] p-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                hindsightStatus === null
                  ? "animate-pulse bg-slate-500"
                  : hindsightStatus.connected
                    ? "bg-emerald-400"
                    : "bg-slate-500"
              }`}
            />
            <p className="text-[11px] font-semibold text-slate-300">Hindsight</p>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
            {hindsightStatus === null
              ? "Checking connection…"
              : hindsightStatus.connected
                ? `Connected · bank "${hindsightStatus.bankId}"`
                : "Not connected — set HINDSIGHT_API_KEY in .env.local"}
          </p>
        </div>
      </div>
    </aside>
  );
}
