import { NextResponse } from "next/server";

/**
 * Shared helpers for Next.js route handlers.
 * Keeps error envelopes consistent across /api/hindsight/* endpoints.
 */

export interface ApiErrorBody {
  error: {
    kind: "not-configured" | "connection-failed";
    message: string;
  };
}

export function jsonError(kind: "not-configured" | "connection-failed", message: string, status: number): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { kind, message } }, { status });
}

export function jsonOk<T>(data: T, status = 200): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, { status });
}
