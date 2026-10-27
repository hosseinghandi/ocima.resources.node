import { useCallback, useEffect, useState } from "react";
import type { Employee, EmployeeInput } from "../../backend/contracts/people";
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  updateEmployee,
} from "../services/people";

function errorMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : "Impossibile aggiornare l'archivio dipendenti.";
}

function sortEmployees(employees: Employee[]): Employee[] {
  return [...employees].sort((a, b) => a.name.localeCompare(b.name, "it"));
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await getEmployees(signal);
      if (!signal?.aborted) {
        setEmployees(sortEmployees(result));
        setError("");
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (!signal?.aborted) setError(errorMessage(cause));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getEmployees(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setEmployees(sortEmployees(result));
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

  const refresh = useCallback(() => {
    setLoading(true);
    return load();
  }, [load]);

  const add = useCallback(async (input: EmployeeInput) => {
    setError("");
    try {
      const created = await createEmployee(input);
      setEmployees((current) => sortEmployees([...current, created]));
      return created;
    } catch (cause) {
      setError(errorMessage(cause));
      throw cause;
    }
  }, []);

  const edit = useCallback(async (id: number, input: EmployeeInput) => {
    setError("");
    try {
      const updated = await updateEmployee(id, input);
      setEmployees((current) =>
        sortEmployees(current.map((item) => (item.id === id ? updated : item))),
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
      await deleteEmployee(id);
      setEmployees((current) => current.filter((item) => item.id !== id));
    } catch (cause) {
      setError(errorMessage(cause));
      throw cause;
    }
  }, []);

  return {
    employees,
    loading,
    error,
    add,
    edit,
    remove,
    refresh,
    clearError: () => setError(""),
  };
}
