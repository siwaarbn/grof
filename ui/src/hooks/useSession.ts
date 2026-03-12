import { useEffect, useState } from "react";
import { fetchSessionMetrics } from "../api/sessions";
import type { SessionMetrics } from "../types/comparison";

interface UseSessionResult {
  data: SessionMetrics | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches full session metrics (CPU samples + GPU events) for a given session ID.
 * Re-fetches automatically if the ID changes.
 */
export function useSession(id: string | undefined): UseSessionResult {
  const [data, setData] = useState<SessionMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSessionMetrics(id)
      .then((metrics) => {
        if (!cancelled) setData(metrics);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load session data";
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { data, loading, error };
}
