import { useMemo, useState } from "react";
import { FilterField, FilterPanel, filterFieldClass } from "../components/FilterPanel";
import { LeaveEntry, LeaveTotals } from "../components/LeaveParts";
import { useEmployees } from "../hooks/useEmployees";
import { useLeaveRecords } from "../hooks/useLeaveRecords";
import { departmentLabel } from "../../backend/contracts/activities";
import { leaveTypes } from "../../backend/contracts/leave";

export function LeaveAdminPage() {
  const { requests, loading, error } = useLeaveRecords();
  const { employees } = useEmployees();
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const employeeById = useMemo(() => new Map(employees.map((item) => [item.id, item])), [employees]);

  const scoped = useMemo(
    () => requests.filter((item) => !employeeId || item.employeeId === Number(employeeId)),
    [requests, employeeId],
  );
  const filtered = useMemo(
    () =>
      scoped.filter(
        (item) =>
          (!type || item.type === type) &&
          (!from || item.endDate >= from) &&
          (!to || item.startDate <= to),
      ),
    [scoped, type, from, to],
  );

  return (
    <div className="space-y-3.5">
      <header>
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Ferie e straordinari</h1>
        <p className="text-sm text-ink-secondary">Ferie, permessi, straordinari e malattia registrati dai dipendenti.</p>
      </header>

      <LeaveTotals requests={scoped} month={month} onMonthChange={setMonth} />

      <FilterPanel
        active={Boolean(employeeId || type || from || to)}
        onReset={() => {
          setEmployeeId("");
          setType("");
          setFrom("");
          setTo("");
        }}
      >
        <FilterField label="Dipendente">
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className={filterFieldClass}>
            <option value="">Tutti</option>
            {employees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="Tipo">
          <select value={type} onChange={(event) => setType(event.target.value)} className={filterFieldClass}>
            <option value="">Tutti</option>
            {leaveTypes.map((item) => <option key={item}>{item}</option>)}
          </select>
        </FilterField>
        <FilterField label="Dal">
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={filterFieldClass} />
        </FilterField>
        <FilterField label="Al">
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={filterFieldClass} />
        </FilterField>
      </FilterPanel>

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
        <header className="flex items-baseline justify-between border-b border-border px-3.5 py-2.5 sm:px-4">
          <h2 className="text-sm font-extrabold text-ink">Registrazioni</h2>
          <p className="text-xs text-ink-secondary">{filtered.length} di {requests.length}</p>
        </header>
        {error ? (
          <p className="p-5 text-center text-sm font-semibold text-red-700" role="alert">{error}</p>
        ) : loading ? (
          <p className="p-5 text-center text-sm text-ink-secondary">Caricamento...</p>
        ) : filtered.length === 0 ? (
          <p className="p-5 text-center text-sm text-ink-secondary">Nessuna registrazione con questi filtri.</p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((request) => {
              const employee = employeeById.get(request.employeeId);
              return (
                <LeaveEntry
                  key={request.id}
                  request={request}
                  employeeName={
                    employee
                      ? `${employee.name} · ${departmentLabel(employee.department)}`
                      : "Dipendente non trovato"
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
