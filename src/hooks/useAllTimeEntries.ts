import { useEffect, useState } from "react";
import type { TimeEntry } from "../../shared/timeEntry";
import { getTimeEntries } from "../services/timeEntries";

export function useAllTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getTimeEntries({}, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setEntries(result);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossibile caricare le ore registrate.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return { entries, loading, error };
}
