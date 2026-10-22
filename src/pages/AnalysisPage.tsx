import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { useAllTimeEntries } from "../hooks/useAllTimeEntries";
import { useCommesse } from "../hooks/useCommesse";
import { useEmployees } from "../hooks/useEmployees";
import { departmentLabel } from "../../shared/activities";
import {
  commessaSearchText,
  formatCommessaCode,
  formatCommessaLabel,
} from "../../shared/commessa";
import type { TimeEntry } from "../../shared/timeEntry";
import { downloadCsv, formatDate, formatHours } from "../utils";

const fieldClass =
  "mt-1.5 min-h-10 w-full rounded-lg border border-border-strong bg-white px-3 text-sm font-medium text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";

function sumBy<T>(items: T[], key: (item: T) => string | number, value: (item: T) => number) {
  const map = new Map<string | number, number>();
  for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + value(item));
  return map;
}

function activityTotals(items: TimeEntry[]) {
  return Array.from(
    sumBy(items, (entry) => entry.activity, (entry) => entry.hours),
    ([name, value]) => ({ name: String(name), value }),
  ).sort((a, b) => b.value - a.value);
}

export function AnalysisPage() {
  const { commesse, loading: commesseLoading, error: commesseError } = useCommesse();
  const { entries, loading: entriesLoading, error: entriesError } = useAllTimeEntries();
  const { employees } = useEmployees();
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const employeeById = useMemo(() => new Map(employees.map((item) => [item.id, item])), [employees]);

  const periodEntries = useMemo(
    () => entries.filter((entry) => (!from || entry.date >= from) && (!to || entry.date <= to)),
    [entries, from, to],
  );

  const projects = useMemo(() => {
    const byProject = new Map<string, TimeEntry[]>();
    for (const entry of periodEntries) {
      const list = byProject.get(entry.project);
      if (list) list.push(entry);
      else byProject.set(entry.project, [entry]);
    }
    return commesse
      .map((commessa) => {
        const code = formatCommessaCode(commessa);
        const list = byProject.get(code) ?? [];
        return {
          code,
          commessa,
          label: formatCommessaLabel(commessa),
          search: commessaSearchText(commessa),
          entries: list,
          hours: list.reduce((total, entry) => total + entry.hours, 0),
          people: new Set(list.map((entry) => entry.employeeId)).size,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "it", { numeric: true }));
  }, [commesse, periodEntries]);

  const normalizedQuery = query.trim().toLocaleLowerCase("it");
  const selected = projects.find((project) => project.code === selectedCode);
  const matches = normalizedQuery ? projects.filter((project) => project.search.includes(normalizedQuery)) : [];
  const showResults = normalizedQuery.length > 0 && !selected;
  const ranking = useMemo(
    () => projects.filter((project) => project.hours > 0).sort((a, b) => b.hours - a.hours).slice(0, 15),
    [projects],
  );

  const detail = useMemo(() => {
    if (!selected) return null;
    const sorted = selected.entries.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const byDepartment = new Map<string, TimeEntry[]>();
    for (const entry of sorted) {
      const key = employeeById.get(entry.employeeId)?.department ?? "";
      const list = byDepartment.get(key);
      if (list) list.push(entry);
      else byDepartment.set(key, [entry]);
    }
    const departments = Array.from(byDepartment, ([department, list]) => {
      const people = Array.from(
        sumBy(list, (entry) => entry.employeeId, (entry) => entry.hours),
        ([id, hours]) => {
          const own = list.filter((entry) => entry.employeeId === id);
          return { id: Number(id), hours, count: own.length, activities: activityTotals(own) };
        },
      ).sort((a, b) => b.hours - a.hours);
      return { department, hours: list.reduce((total, entry) => total + entry.hours, 0), people };
    }).sort((a, b) => b.hours - a.hours);
    const dates = sorted.map((entry) => entry.date).sort();
    return {
      sorted,
      departments,
      activities: activityTotals(sorted),
      days: new Set(dates).size,
      first: dates[0],
      last: dates[dates.length - 1],
    };
  }, [selected, employeeById]);

  const nameFor = (id: number) => employeeById.get(id)?.name ?? "Dipendente non assegnato";

  function select(code: string, label: string) {
    setSelectedCode(code);
    setQuery(label);
  }

  function exportCsv() {
    if (!selected || !detail) return;
    downloadCsv(`commessa-${selected.code}.csv`, [
      ["Data", "Dipendente", "Reparto", "Commessa", "Attività", "Ore", "Note"],
      ...detail.sorted.map((entry) => [
        entry.date,
        nameFor(entry.employeeId),
        departmentLabel(employeeById.get(entry.employeeId)?.department ?? ""),
        selected.label,
        entry.activity,
        entry.hours,
        entry.notes,
      ]),
    ]);
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary">Analisi</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Analisi commesse</h1>
        <p className="mt-1 text-sm text-ink-secondary">Ore registrate per commessa, suddivise per reparto, persona e attività.</p>
      </header>

      <section className="rounded-xl border border-border bg-white p-4 shadow-card sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_160px]">
          <label className="relative block text-xs font-semibold text-ink-secondary">
            Commessa (codice, denominazione, disegno o cliente)
            <Icon name="search" className="absolute left-3 top-[2.2rem] size-4 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedCode(null);
              }}
              placeholder="Cerca una commessa..."
              aria-label="Cerca una commessa"
              className={`${fieldClass} pl-9`}
            />
          </label>
          <label className="block text-xs font-semibold text-ink-secondary">
            Dal
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-xs font-semibold text-ink-secondary">
            Al
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={fieldClass} />
          </label>
        </div>
        {(commesseError || entriesError) && (
          <p className="mt-2 text-sm font-semibold text-red-700" role="alert">{commesseError || entriesError}</p>
        )}
        {showResults ? (
          <div role="listbox" aria-label="Risultati commesse" className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-border bg-white shadow-card">
            {commesseLoading ? (
              <p className="px-4 py-3 text-sm text-ink-secondary">Caricamento commesse...</p>
            ) : matches.length > 0 ? (
              matches.map((project) => (
                <button
                  key={project.code}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => select(project.code, project.label)}
                  className="flex min-h-14 w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-primary-tint/50 focus-visible:bg-primary-tint/50 focus-visible:outline-none"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-tint text-primary"><Icon name="briefcase" className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{project.label}</span>
                    {project.commessa.cliente && <span className="block truncate text-xs text-ink-secondary">{project.commessa.cliente}</span>}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-ink-secondary">{formatHours(project.hours)}</span>
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-ink-secondary">Nessuna commessa trovata.</p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs text-ink-muted">
            {selected ? "Commessa selezionata" : `${projects.length} commesse nell’archivio · cerca per vedere il dettaglio`}
          </p>
        )}
      </section>

      {!selected && !showResults && (
        <section className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
          <header className="border-b border-border px-4 py-3.5 sm:px-5">
            <h2 className="font-extrabold text-ink">Commesse con più ore</h2>
            <p className="mt-0.5 text-xs text-ink-secondary">Seleziona una commessa per aprire l’analisi.</p>
          </header>
          {entriesLoading || commesseLoading ? (
            <p className="p-8 text-center text-sm text-ink-secondary">Caricamento...</p>
          ) : ranking.length === 0 ? (
            <p className="p-8 text-center text-sm text-ink-secondary">Nessuna ora registrata nel periodo.</p>
          ) : (
            <div className="divide-y divide-border">
              {ranking.map((project) => (
                <button
                  key={project.code}
                  type="button"
                  onClick={() => select(project.code, project.label)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left hover:bg-primary-tint/30 sm:grid-cols-[minmax(0,1fr)_90px_90px_80px] sm:px-5"
                >
                  <span className="truncate text-sm font-bold text-ink">{project.label}</span>
                  <span className="hidden text-xs text-ink-secondary sm:block">{project.people} persone</span>
                  <span className="hidden text-xs text-ink-secondary sm:block">{project.entries.length} reg.</span>
                  <span className="text-right text-sm font-extrabold text-ink">{formatHours(project.hours)}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {selected && detail && (
        <>
          <section className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted/40 px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-tint text-primary"><Icon name="briefcase" className="size-4" /></span>
                <div className="min-w-0">
                  <h2 className="truncate font-extrabold text-ink">{selected.label}</h2>
                  <p className="mt-0.5 truncate text-xs text-ink-secondary">
                    {[selected.commessa.cliente, selected.commessa.disegno && `Disegno ${selected.commessa.disegno}`].filter(Boolean).join(" · ") || "Riepilogo commessa"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={exportCsv}
                disabled={detail.sorted.length === 0}
                className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink-secondary hover:bg-surface-muted disabled:opacity-50"
              >
                <Icon name="download" className="size-4" /> Esporta CSV
              </button>
            </header>
            <div className="grid grid-cols-2 gap-3 p-3 sm:p-4 lg:grid-cols-4">
              {[
                { label: "Ore totali", value: formatHours(selected.hours) },
                { label: "Persone", value: String(selected.people) },
                { label: "Registrazioni", value: String(detail.sorted.length) },
                { label: "Giorni di lavoro", value: String(detail.days) },
              ].map((card) => (
                <div key={card.label} className="rounded-lg border border-border p-3 sm:p-4">
                  <p className="text-xs font-bold text-ink-secondary">{card.label}</p>
                  <p className="mt-2 text-xl font-extrabold text-ink sm:text-2xl">{card.value}</p>
                </div>
              ))}
            </div>
            {detail.first && (
              <p className="border-t border-border px-4 py-3 text-xs text-ink-secondary sm:px-5">
                Prima registrazione {formatDate(detail.first)} · ultima {formatDate(detail.last)}
              </p>
            )}
          </section>

          {detail.sorted.length === 0 ? (
            <p className="rounded-xl border border-border bg-white p-8 text-center text-sm text-ink-secondary shadow-card">
              Nessuna ora registrata su questa commessa nel periodo selezionato.
            </p>
          ) : (
            <>
              <section className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
                <header className="border-b border-border px-4 py-3.5 sm:px-5">
                  <h2 className="font-extrabold text-ink">Ore per reparto e persona</h2>
                </header>
                <div className="divide-y divide-border">
                  {detail.departments.map((group) => (
                    <div key={group.department} className="px-4 py-4 sm:px-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-extrabold text-ink">{group.department ? departmentLabel(group.department) : "Non assegnato"}</h3>
                        <span className="text-sm font-extrabold text-ink">
                          {formatHours(group.hours)} <span className="font-semibold text-ink-muted">· {Math.round((group.hours / selected.hours) * 100)}%</span>
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(group.hours / selected.hours) * 100}%` }} />
                      </div>
                      <div className="mt-3 grid gap-2 lg:grid-cols-2">
                        {group.people.map((person) => (
                          <article key={person.id} className="rounded-lg border border-border p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-bold text-ink">{nameFor(person.id)}</p>
                              <p className="shrink-0 text-sm font-extrabold text-ink">{formatHours(person.hours)}</p>
                            </div>
                            <p className="mt-0.5 text-[11px] text-ink-muted">{person.count} {person.count === 1 ? "registrazione" : "registrazioni"}</p>
                            <ul className="mt-2 space-y-1">
                              {person.activities.map((item) => (
                                <li key={item.name} className="flex justify-between gap-3 text-xs text-ink-secondary">
                                  <span className="truncate">{item.name}</span>
                                  <span className="shrink-0 font-semibold text-ink">{formatHours(item.value)}</span>
                                </li>
                              ))}
                            </ul>
                          </article>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
                <header className="border-b border-border px-4 py-3.5 sm:px-5">
                  <h2 className="font-extrabold text-ink">Ore per attività</h2>
                </header>
                <div className="divide-y divide-border">
                  {detail.activities.map((item) => (
                    <div key={item.name} className="px-4 py-3 sm:px-5">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-semibold text-ink">{item.name}</span>
                        <span className="shrink-0 font-extrabold text-ink">{formatHours(item.value)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${(item.value / selected.hours) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
                <header className="border-b border-border px-4 py-3.5 sm:px-5">
                  <h2 className="font-extrabold text-ink">Registrazioni</h2>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-surface-muted/70 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      <tr>
                        <th className="px-5 py-2.5">Data</th>
                        <th className="px-3 py-2.5">Dipendente</th>
                        <th className="px-3 py-2.5">Attività</th>
                        <th className="px-3 py-2.5 text-right">Ore</th>
                        <th className="px-5 py-2.5">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detail.sorted.map((entry) => (
                        <tr key={entry.id} className="align-top">
                          <td className="whitespace-nowrap px-5 py-2 text-ink-secondary">{formatDate(entry.date)}</td>
                          <td className="px-3 py-2 font-semibold text-ink">{nameFor(entry.employeeId)}</td>
                          <td className="px-3 py-2 text-ink">{entry.activity}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-extrabold text-ink">{formatHours(entry.hours)}</td>
                          <td className="px-5 py-2 text-xs text-ink-secondary">{entry.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
