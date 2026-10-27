import { useCallback, useEffect, useState } from "react";
import type {
  CreateTimeEntryInput,
  TimeEntry,
} from "../../backend/contracts/timeEntry";
import {
  createTimeEntry,
  deleteTimeEntry,
  getTimeEntries,
  updateTimeEntry,
} from "../services/timeEntries";

export function useEntryData(
  month: string,
  enabled: boolean,
  employeeId: number | null,
) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const key = `${employeeId}:${month}`;
  const active = enabled && employeeId !== null;

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!active) return;
      setLoading(true);
      try {
        const result = await getTimeEntries({ month, employeeId }, signal);
        if (!signal?.aborted) {
          setEntries(result);
          setError("");
        }
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (!signal?.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossibile caricare le ore.",
          );
        }
        throw cause;
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setLoadedKey(key);
        }
      }
    },
    [active, month, employeeId, key],
  );

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    getTimeEntries({ month, employeeId }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setEntries(result);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossibile caricare le ore.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadedKey(key);
        }
      });
    return () => controller.abort();
  }, [active, month, employeeId, key]);

  const add = useCallback(
    async (input: CreateTimeEntryInput) => {
      setError("");
      try {
        const created = await createTimeEntry(input);
        if (input.date.slice(0, 7) === month) {
          setEntries((current) => [created, ...current]);
        }
        return created;
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Impossibile salvare le ore.",
        );
        throw cause;
      }
    },
    [month],
  );

  const update = useCallback(
    async (id: number, input: CreateTimeEntryInput) => {
      const saved = await updateTimeEntry(id, input);
      setEntries((current) =>
        saved.date.slice(0, 7) === month
          ? current.map((item) => (item.id === id ? saved : item))
          : current.filter((item) => item.id !== id),
      );
      return saved;
    },
    [month],
  );

  const remove = useCallback(async (entry: TimeEntry) => {
    await deleteTimeEntry(entry.id, entry.employeeId);
    setEntries((current) => current.filter((item) => item.id !== entry.id));
  }, []);

  return {
    entries,
    loading: active && (loading || loadedKey !== key),
    error,
    add,
    update,
    remove,
    refresh,
    clearError: () => setError(""),
  };
}
