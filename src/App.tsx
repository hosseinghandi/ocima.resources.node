import { useCallback, useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { HoursPage } from "./pages/HoursPage";
import { SummaryPage } from "./pages/SummaryPage";
import { AdminPage } from "./pages/AdminPage";
import { AuthPage } from "./pages/AuthPage";
import { demoEmployees, getDemoTimeEntries, type Employee } from "./demoData";
import { getTimeEntries } from "./services/timeEntries";
import type { TimeEntry } from "../shared/timeEntry";

export type Page = "employees" | "reports" | "hours" | "summary";
export type UserRole = "admin" | "employee";

function currentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

export default function App() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [page, setPage] = useState<Page>("employees");
  const [employees, setEmployees] = useState<Employee[]>(demoEmployees);
  const [employeeId, setEmployeeId] = useState(demoEmployees[0].id);
  const [month, setMonth] = useState(currentMonth);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshEntries = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await getTimeEntries(month, signal);
      setEntries(result.length > 0 ? result : getDemoTimeEntries(employeeId, month));
      setError("");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setEntries(getDemoTimeEntries(employeeId, month));
      setError(cause instanceof Error ? cause.message : "Impossibile caricare le ore.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [employeeId, month]);

  useEffect(() => {
    if (role !== "employee") return;
    const controller = new AbortController();
    getTimeEntries(month, controller.signal)
      .then((result) => {
        setEntries(result.length > 0 ? result : getDemoTimeEntries(employeeId, month));
        setError("");
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setEntries(getDemoTimeEntries(employeeId, month));
        setError(cause instanceof Error ? cause.message : "Impossibile caricare le ore.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [employeeId, month, role]);

  const handleEntrySaved = (entry: TimeEntry) => {
    if (entry.date.slice(0, 7) === month) {
      setEntries((current) => [entry, ...current]);
    } else {
      setLoading(true);
      void refreshEntries();
    }
  };

  if (!role) {
    return (
      <AuthPage
        employees={employees}
        onSignIn={(nextRole, selectedEmployeeId) => {
          setRole(nextRole);
          if (selectedEmployeeId) setEmployeeId(selectedEmployeeId);
          if (nextRole === "employee") setLoading(true);
          setPage(nextRole === "admin" ? "employees" : "hours");
          setError("");
        }}
        onRegister={(employee) => {
          setEmployees((current) => [employee, ...current]);
          setEmployeeId(employee.id);
          setLoading(true);
          setRole("employee");
          setPage("hours");
        }}
      />
    );
  }

  const currentEmployee = employees.find((employee) => employee.id === employeeId) ?? employees[0];

  return (
    <AppShell
      page={page}
      role={role}
      userName={role === "admin" ? "Amministratore" : currentEmployee.name}
      onPageChange={setPage}
      onSignOut={() => {
        setRole(null);
        setError("");
      }}
    >
      {role === "admin" ? (
        <AdminPage
          page={page}
          employees={employees}
          onEmployeesChange={setEmployees}
        />
      ) : (
        <>
          {error && (
            <div
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
              role="alert"
            >
              {error}
              <button
                className="ml-3 font-bold underline underline-offset-2"
                onClick={() => {
                  setLoading(true);
                  void refreshEntries();
                }}
              >
                Riprova
              </button>
            </div>
          )}
          {page === "hours" ? (
            <HoursPage onEntrySaved={handleEntrySaved} />
          ) : (
            <SummaryPage
              entries={entries}
              loading={loading}
              month={month}
              onMonthChange={(value) => {
                setLoading(true);
                setMonth(value);
              }}
            />
          )}
        </>
      )}
    </AppShell>
  );
}
