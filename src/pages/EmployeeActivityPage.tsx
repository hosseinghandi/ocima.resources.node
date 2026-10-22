import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { useActivities } from "../hooks/useActivities";
import { useAllTimeEntries } from "../hooks/useAllTimeEntries";
import { useCommesse } from "../hooks/useCommesse";
import { useEmployees } from "../hooks/useEmployees";
import { departmentLabel } from "../../shared/activities";
import {
  commessaSearchText,
  formatCommessaCode,
  formatCommessaLabel,
} from "../../shared/commessa";
import { downloadCsv, formatDate, formatHours } from "../utils";

const fieldClass =
  "mt-1.5 min-h-10 w-full rounded-lg border border-border-strong bg-white px-3 text-sm font-medium text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";

function monthStart() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
}

export function EmployeeActivityPage() {
  const { entries, loading, error } = useAllTimeEntries();
  const { employees } = useEmployees();
  const { commesse } = useCommesse();
  const { catalog } = useActivities();

  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState("");
  const [commessaQuery, setCommessaQuery] = useState("");
  const [activity, setActivity] = useState("");

  const employeeById = useMemo(() => new Map(employees.map((item) => [item.id, item])), [employees]);
  const commessaLabels = useMemo(
    () => new Map(commesse.map((item) => [formatCommessaCode(item), formatCommessaLabel(item)])),
    [commesse],
  );
  const activityOptions = useMemo(() => {
    const source = department ? catalog.filter((item) => item.reparto === department) : catalog;
    return Array.from(new Set(source.flatMap((item) => item.attivita))).sort((a, b) => a.localeCompare(b, "it"));
  }, [catalog, department]);

  const filtered = useMemo(() => {
    const normalized = commessaQuery.trim().toLocaleLowerCase("it");
    const matchingCodes = normalized
      ? new Set(
          commesse
            .filter((item) => commessaSearchText(item).includes(normalized))
            .map((item) => formatCommessaCode(item)),
        )
      : null;
    return entries.filter((entry) => {
      if (employeeId && entry.employeeId !== Number(employeeId)) return false;
      if (department && employeeById.get(entry.employeeId)?.department !== department) return false;
      if (from && entry.date < from) return false;
      if (to && entry.date > to) return false;
      if (activity && entry.activity !== activity) return false;
      if (matchingCodes && !matchingCodes.has(entry.project)) return false;
      return true;
    });
  }, [entries, commesse, employeeById, employeeId, department, from, to, activity, commessaQuery]);

  const groups = useMemo(() => {
    const map = new Map<number, typeof filtered>();
    for (const entry of filtered) {
      const list = map.get(entry.employeeId);
      if (list) list.push(entry);
      else map.set(entry.employeeId, [entry]);
    }
    return Array.from(map, ([id, list]) => {
      const sorted = list.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
      return {
        id,
        employee: employeeById.get(id),
        entries: sorted,
        hours: sorted.reduce((total, entry) => total + entry.hours, 0),
        days: new Set(sorted.map((entry) => entry.date)).size,
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [filtered, employeeById]);

  const totalHours = filtered.reduce((total, entry) => total + entry.hours, 0);
  const labelFor = (code: string) => commessaLabels.get(code) ?? code;
  const nameFor = (id: number) => employeeById.get(id)?.name ?? "Non assegnato";
  const filtersActive = Boolean(employeeId || department || to || activity || commessaQuery || from !== monthStart());

  function reset() {
    setEmployeeId("");
    setDepartment("");
    setFrom(monthStart());
    setTo("");
    setActivity("");
    setCommessaQuery("");
  }

  function exportCsv() {
    downloadCsv("attivita-dipendenti.csv", [
      ["Data", "Dipendente", "Reparto", "Commessa", "Attività", "Ore", "Note"],
      ...filtered
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((entry) => [
          entry.date,
          nameFor(entry.employeeId),
          departmentLabel(employeeById.get(entry.employeeId)?.department ?? ""),
          labelFor(entry.project),
          entry.activity,
          entry.hours,
          entry.notes,
        ]),
    ]);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Analisi</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Attività dipendenti</h1>
          <p className="mt-1 text-sm text-ink-secondary">Tutte le ore registrate, con il dettaglio di ogni dipendente.</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink-secondary hover:bg-surface-muted disabled:opacity-50"
        >
          <Icon name="download" className="size-4" /> Esporta CSV
        </button>
      </header>

      {error && <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-800" role="alert">{error}</p>}

      <section className="rounded-xl border border-border bg-white p-4 shadow-card sm:p-5" aria-label="Filtri">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-semibold text-ink-secondary">
            Dipendente
            <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className={fieldClass}>
              <option value="">Tutti</option>
              {employees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-ink-secondary">
            Reparto
            <select
              value={department}
              onChange={(event) => {
                setDepartment(event.target.value);
                setActivity("");
              }}
              className={fieldClass}
            >
              <option value="">Tutti</option>
              {catalog.map((item) => <option key={item.reparto} value={item.reparto}>{departmentLabel(item.reparto)}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-ink-secondary">
            Dal
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-xs font-semibold text-ink-secondary">
            Al
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-xs font-semibold text-ink-secondary sm:col-span-2">
            Commessa (codice, denominazione, disegno o cliente)
            <input
              type="search"
              value={commessaQuery}
              onChange={(event) => setCommessaQuery(event.target.value)}
              placeholder="Es. 261035 o MISCELATRICE"
              className={fieldClass}
            />
          </label>
          <label className="block text-xs font-semibold text-ink-secondary">
            Attività
            <select value={activity} onChange={(event) => setActivity(event.target.value)} className={fieldClass}>
              <option value="">Tutte</option>
              {activityOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={reset}
              disabled={!filtersActive}
              className="min-h-10 w-full rounded-lg border border-border px-3 text-sm font-bold text-ink-secondary hover:bg-surface-muted disabled:opacity-50"
            >
              Reimposta filtri
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Ore totali", value: formatHours(totalHours), icon: "clock" },
          { label: "Registrazioni", value: String(filtered.length), icon: "note" },
          { label: "Dipendenti", value: String(groups.length), icon: "people" },
          { label: "Media ore / dipendente", value: formatHours(groups.length ? totalHours / groups.length : 0), icon: "chart" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-bold text-ink-secondary">{card.label}</span>
              <Icon name={card.icon as "clock"} className="size-4 shrink-0 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-ink">{card.value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
        <header className="border-b border-border px-4 py-3.5 sm:px-5">
          <h2 className="font-extrabold text-ink">Dettaglio per dipendente</h2>
          <p className="mt-0.5 text-xs text-ink-secondary">Apri un dipendente per vedere ogni registrazione.</p>
        </header>
        {loading ? (
          <p className="p-8 text-center text-sm text-ink-secondary">Caricamento attività...</p>
        ) : groups.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-secondary">Nessuna registrazione con questi filtri.</p>
        ) : (
          <div className="divide-y divide-border">
            {groups.map((group) => (
              <details key={group.id} className="group">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 hover:bg-primary-tint/30 sm:px-5">
                  <Icon name="chevron" className="size-4 shrink-0 text-ink-muted transition group-open:rotate-90" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{group.employee?.name ?? "Dipendente non assegnato"}</span>
                    <span className="block truncate text-xs text-ink-secondary">
                      {group.employee ? departmentLabel(group.employee.department) : "Registrazioni precedenti"}
                    </span>
                  </span>
                  <span className="text-xs text-ink-secondary">{group.days} {group.days === 1 ? "giorno" : "giorni"}</span>
                  <span className="text-xs text-ink-secondary">{group.entries.length} reg.</span>
                  <span className="w-20 text-right text-sm font-extrabold text-ink">{formatHours(group.hours)}</span>
                </summary>
                <div className="overflow-x-auto border-t border-border bg-surface-muted/30">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      <tr>
                        <th className="px-5 py-2">Data</th>
                        <th className="px-3 py-2">Commessa</th>
                        <th className="px-3 py-2">Attività</th>
                        <th className="px-3 py-2 text-right">Ore</th>
                        <th className="px-5 py-2">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {group.entries.map((entry) => (
                        <tr key={entry.id} className="align-top">
                          <td className="whitespace-nowrap px-5 py-2 text-ink-secondary">{formatDate(entry.date)}</td>
                          <td className="px-3 py-2 font-semibold text-ink">{labelFor(entry.project)}</td>
                          <td className="px-3 py-2 text-ink">{entry.activity}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-extrabold text-ink">{formatHours(entry.hours)}</td>
                          <td className="px-5 py-2 text-xs text-ink-secondary">{entry.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
