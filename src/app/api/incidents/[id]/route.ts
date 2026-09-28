import { NextResponse } from "next/server";
import { findIncident } from "@/lib/incident-store";

export const dynamic = "force-dynamic";

/** GET /api/incidents/[id] — resolve any incident id (runtime store first, then demo). */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const incident = findIncident(decodeURIComponent(id));
  if (!incident) {
    return NextResponse.json({ error: `Incident ${id} not found` }, { status: 404 });
  }
  return NextResponse.json({ data: incident });
}
