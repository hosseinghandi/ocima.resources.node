import { useCallback, useEffect, useState } from "react";
import type { LeaveRecord } from "../../backend/contracts/leave";
import { getLeaveRecords } from "../services/leave";

function errorMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : "Impossibile caricare le richieste.";
}

/** Loads leave records: one employee's, or all of them when no id is given. */
export function useLeaveRecords(employeeId?: number) {
  const [requests, setRequests] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getLeaveRecords(employeeId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setRequests(result);
        setError("");
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (!controller.signal.aborted) setError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [employeeId, version]);

  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  return { requests, loading, error, refresh };
}
