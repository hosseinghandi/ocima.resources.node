import { useState } from "react";
import { AppShell } from "./components/AppShell";
import { HoursPage } from "./pages/HoursPage";
import { SummaryPage } from "./pages/SummaryPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { EmployeeActivityPage } from "./pages/EmployeeActivityPage";
import { CommessePage } from "./pages/CommessePage";
import { AuthPage } from "./pages/AuthPage";
import { useEmployees } from "./hooks/useEmployees";
import { useEntryData } from "./hooks/useEntryData";
import type { CreateTimeEntryInput, TimeEntry } from "../shared/timeEntry";
import type { Session } from "../shared/people";

export type Page = "employees" | "activity" | "reports" | "commesse" | "hours" | "summary";
export type UserRole = "admin" | "employee";

function currentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function EmployeeHours({
  employeeId,
  onSave,
}: {
  employeeId: number;
  onSave: (input: CreateTimeEntryInput) => Promise<TimeEntry>;
}) {
  const { employees, loading, error } = useEmployees();
  const employee = employees.find((item) => item.id === employeeId);
  if (!employee) {
    return (
      <p className="rounded-xl border border-border bg-white p-6 text-sm text-ink-secondary">
        {loading ? "Caricamento profilo..." : error || "Profilo dipendente non trovato."}
      </p>
    );
  }
  return <HoursPage employee={employee} onSave={onSave} />;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [page, setPage] = useState<Page>("employees");
  const [month, setMonth] = useState(currentMonth);
  const role = session?.role ?? null;
  const entryData = useEntryData(month, role === "employee", session?.id ?? null);

  if (!session) {
    return (
      <AuthPage
        onSignIn={(next) => {
          setSession(next);
          setPage(next.role === "admin" ? "employees" : "hours");
          entryData.clearError();
        }}
      />
    );
  }

  return (
    <AppShell
      page={page}
      role={session.role}
      userId={session.id}
      userName={session.name}
      onPageChange={setPage}
      onSignOut={() => {
        setSession(null);
        entryData.clearError();
      }}
    >
      {session.role === "admin" ? (
        page === "commesse" ? (
          <CommessePage />
        ) : page === "activity" ? (
          <EmployeeActivityPage />
        ) : page === "reports" ? (
          <AnalysisPage />
        ) : (
          <EmployeesPage adminId={session.id} />
        )
      ) : (
        <>
          {entryData.error && (
            <div
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
              role="alert"
            >
              {entryData.error}
              <button
                className="ml-3 font-bold underline underline-offset-2"
                onClick={() => {
                  void entryData.refresh().catch(() => {});
                }}
              >
                Riprova
              </button>
            </div>
          )}
          {page === "hours" ? (
            <EmployeeHours employeeId={session.id} onSave={entryData.add} />
          ) : (
            <SummaryPage
              entries={entryData.entries}
              loading={entryData.loading}
              month={month}
              onMonthChange={setMonth}
            />
          )}
        </>
      )}
    </AppShell>
  );
}
