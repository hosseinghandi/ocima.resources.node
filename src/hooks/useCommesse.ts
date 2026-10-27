import { useCallback, useEffect, useState } from "react";
import type { Commessa, CommesseInput } from "../../backend/contracts/commessa";
import {
  createCommessa,
  deleteCommessa,
  getCommesse,
  updateCommessa,
} from "../services/commesse";

function errorMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : "Impossibile aggiornare l'archivio commesse.";
}

function sortCommesse(commesse: Commessa[]): Commessa[] {
  return [...commesse].sort((a, b) =>
    a.commessa.localeCompare(b.commessa, "it", { numeric: true }),
  );
}

export function useCommesse() {
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const result = await getCommesse(signal);
      if (!signal?.aborted) {
        setCommesse(sortCommesse(result));
        setError("");
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (!signal?.aborted) setError(errorMessage(cause));
      throw cause;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getCommesse(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setCommesse(sortCommesse(result));
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (!controller.signal.aborted) setError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const add = useCallback(async (input: CommesseInput) => {
    setError("");
    try {
      const created = await createCommessa(input);
      setCommesse((current) => sortCommesse([...current, created]));
      return created;
    } catch (cause) {
      setError(errorMessage(cause));
      throw cause;
    }
  }, []);

  const edit = useCallback(async (id: number, input: CommesseInput) => {
    setError("");
    try {
      const updated = await updateCommessa(id, input);
      setCommesse((current) =>
        sortCommesse(current.map((item) => (item.id === id ? updated : item))),
      );
      return updated;
    } catch (cause) {
      setError(errorMessage(cause));
      throw cause;
    }
  }, []);

  const remove = useCallback(async (id: number) => {
    setError("");
    try {
      await deleteCommessa(id);
      setCommesse((current) => current.filter((item) => item.id !== id));
    } catch (cause) {
      setError(errorMessage(cause));
      throw cause;
    }
  }, []);

  return {
    commesse,
    loading,
    error,
    add,
    edit,
    remove,
    refresh,
    clearError: () => setError(""),
  };
}
