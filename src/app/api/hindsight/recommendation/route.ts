import { reflectRecommendation } from "@/lib/hindsight";
import { jsonError, jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

interface RecommendationBody {
  title?: string;
  service?: string;
  severity?: string;
  errorMessage?: string;
  description?: string;
}

export async function POST(request: Request) {
  let body: RecommendationBody;
  try {
    body = await request.json();
  } catch {
    return jsonError("connection-failed", "Invalid JSON body", 400);
  }

  if (!body.title || !body.service) {
    return jsonError("connection-failed", "title and service are required", 400);
  }

  try {
    const outcome = await reflectRecommendation({
      title: body.title,
      service: body.service,
      severity: body.severity ?? "unknown",
      errorMessage: body.errorMessage ?? "",
      description: body.description,
    });

    if (outcome.state === "error") {
      const status = outcome.failure.kind === "not-configured" ? 503 : 502;
      return jsonError(outcome.failure.kind, outcome.failure.message, status);
    }

    return jsonOk(outcome);
  } catch (err) {
    return jsonError(
      "connection-failed",
      err instanceof Error ? err.message : "Recommendation failed",
      502
    );
  }
}
