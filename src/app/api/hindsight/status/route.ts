import { getHindsightStatus } from "@/lib/hindsight";
import { jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getHindsightStatus();
    return jsonOk(status);
  } catch (err) {
    return jsonOk({
      connected: false,
      configured: Boolean(process.env.HINDSIGHT_API_KEY?.trim()),
      bankId: process.env.HINDSIGHT_BANK_ID?.trim() || "incidentiq",
      message: err instanceof Error ? err.message : "Status check failed",
    });
  }
}
