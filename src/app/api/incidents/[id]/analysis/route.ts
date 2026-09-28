import { NextResponse } from "next/server";
import { findIncident } from "@/lib/incident-store";
import { loadInvestigation } from "@/lib/investigation-loader";

export const dynamic = "force-dynamic";

/**
 * GET /api/incidents/[id]/analysis — the investigation bundle for any incident
 * (live FastAPI + Hindsight pipeline when available, demo/empty otherwise).
 * Feeds the post-mortem draft editor, which is a client component.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const incident = findIncident(decodeURIComponent(id));
  if (!incident) {
    return NextResponse.json({ error: `Incident ${id} not found` }, { status: 404 });
  }
  const loaded = await loadInvestigation(incident);
  return NextResponse.json({
    data: {
      bundle: loaded.bundle,
      live: loaded.live,
      generatedBy: loaded.meta?.generatedBy ?? null,
    },
  });
}
