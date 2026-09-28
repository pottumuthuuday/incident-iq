"use client";

import { useEffect, useState } from "react";

export interface HindsightStatusValue {
  connected: boolean;
  configured: boolean;
  bankId: string;
  message: string;
  apiVersion?: string;
}

/**
 * Fetches the REAL Hindsight connection status from /api/hindsight/status.
 * Server-side code holds the API key; the client only sees the status summary.
 */
export function useHindsightStatus(): HindsightStatusValue | null {
  const [status, setStatus] = useState<HindsightStatusValue | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hindsight/status")
      .then((res) => res.json())
      .then((payload) => {
        if (!cancelled && payload?.data) setStatus(payload.data as HindsightStatusValue);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({
            connected: false,
            configured: false,
            bankId: "incidentiq",
            message: "Status unavailable",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
