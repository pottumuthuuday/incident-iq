"use client";

import { useState } from "react";

export function LogViewer({ logs, maxVisible = 4 }: { logs: string[]; maxVisible?: number }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? logs : logs.slice(-maxVisible);

  return (
    <div className="overflow-hidden rounded-lg border border-[#1e2a44] bg-[#0e1526]">
      <div className="flex items-center justify-between border-b border-[#1e2a44] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500/70" />
          <span className="h-2 w-2 rounded-full bg-amber-500/70" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
          <span className="ml-2 font-mono text-[11px] text-[#8b99b5]">
            logs · {logs.length} lines
          </span>
        </div>
        {logs.length > maxVisible ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] font-medium text-sky-400 hover:text-sky-300"
          >
            {expanded ? "Collapse" : `Show all ${logs.length} lines`}
          </button>
        ) : null}
      </div>
      <pre className="max-h-96 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-300">
        {visible.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {line}
          </div>
        ))}
      </pre>
    </div>
  );
}
