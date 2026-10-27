import { useEffect, useState } from "react";
import type { DepartmentActivities } from "../../backend/contracts/activities";

export function useActivities() {
  const [catalog, setCatalog] = useState<DepartmentActivities[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/activities", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Impossibile caricare le attività.");
        return response.json() as Promise<DepartmentActivities[]>;
      })
      .then((result) => {
        if (!controller.signal.aborted) setCatalog(result);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Impossibile caricare le attività.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return { catalog, loading, error };
}
