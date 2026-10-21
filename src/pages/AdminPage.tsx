import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "../components/Icon";
import { demoWorkEntries, type DemoWorkEntry, type Employee, type EmployeeStatus } from "../demoData";
import type { Page } from "../App";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-border-strong bg-white px-3 text-sm font-medium text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

function StatusBadge({ status }: { status: EmployeeStatus | DemoWorkEntry["status"] }) {
  const styles = status === "Attivo" || status === "Approvata"
    ? "bg-emerald-50 text-emerald-700"
    : status === "In ferie" || status === "In attesa"
      ? "bg-amber-50 text-amber-700"
      : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${styles}`}><span className="size-1.5 rounded-full bg-current" />{status}</span>;
}

export function AdminPage({
  page,
  employees,
  onEmployeesChange,
}: {
  page: Page;
  employees: Employee[];
  onEmployeesChange: (employees: Employee[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const entries = demoWorkEntries;
  const selectedEmployee = employees.find((employee) => employee.id === selectedId);
  const filteredEmployees = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return employees.filter((employee) =>
      `${employee.name} ${employee.email} ${employee.role} ${employee.department}`.toLowerCase().includes(normalized),
    );
  }, [employees, query]);

  function saveEmployee(employee: Employee) {
    onEmployeesChange(editing
      ? employees.map((item) => item.id === employee.id ? employee : item)
      : [employee, ...employees]);
    setEditorOpen(false);
    setEditing(null);
  }

  function exportReport() {
    const projectHours = entries.reduce<Record<string, number>>((totals, entry) => {
      totals[entry.project] = (totals[entry.project] ?? 0) + entry.hours;
      return totals;
    }, {});
    const rows = [["Commessa", "Dipendente", "Attività", "Data", "Ore", "Stato"]];
    for (const [project, total] of Object.entries(projectHours)) {
      rows.push([project, "TOTALE COMMESSA", "", "", String(total), ""]);
      for (const entry of entries.filter((item) => item.project === project)) {
        const employee = employees.find((person) => person.id === entry.employeeId);
        rows.push([project, employee?.name ?? "Dipendente", entry.activity, entry.date, String(entry.hours), entry.status]);
      }
    }
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(";")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    link.download = "ocima-analisi-commesse.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const pageTitle = page === "employees" ? "Dipendenti" : "Analisi commesse";
  const pageDescription = page === "employees"
    ? "Gestisci le persone, i loro dati e le ore registrate."
    : "Ore totali per commessa, persone coinvolte e dettaglio di ogni attività.";

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Spazio amministratore</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{selectedEmployee && page === "employees" ? selectedEmployee.name : pageTitle}</h1>
          <p className="mt-1 text-sm text-ink-secondary">{selectedEmployee && page === "employees" ? "Scheda completa del dipendente e attività recenti." : pageDescription}</p>
        </div>
        {page === "employees" && !selectedEmployee && (
          <button type="button" onClick={() => { setEditing(null); setEditorOpen(true); }} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary-hover sm:w-auto">
            <Icon name="plus" className="size-4" /> Aggiungi dipendente
          </button>
        )}
        {page === "reports" && (
          <button type="button" onClick={exportReport} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink-secondary transition hover:bg-surface-muted sm:w-auto">
            <Icon name="download" className="size-4" /> Esporta analisi
          </button>
        )}
      </header>

      {page === "employees" && (
        selectedEmployee ? (
          <EmployeeDetails
            employee={selectedEmployee}
            entries={entries.filter((entry) => entry.employeeId === selectedEmployee.id)}
            onBack={() => setSelectedId(null)}
            onEdit={() => { setEditing(selectedEmployee); setEditorOpen(true); }}
          />
        ) : (
          <section className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="font-extrabold text-ink">Tutti i dipendenti</h2>
                <p className="mt-0.5 text-xs text-ink-secondary">{employees.length} profili · clicca una riga per i dettagli</p>
              </div>
              <label className="relative block w-full sm:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca dipendente..." className="min-h-10 w-full rounded-lg border border-border bg-surface-muted/60 pl-9 pr-3 text-sm outline-none focus:border-primary" />
                <span className="sr-only">Cerca dipendente</span>
              </label>
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left">
                <thead className="bg-surface-muted/70 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  <tr><th className="px-5 py-3">Dipendente</th><th className="px-4 py-3">Ruolo / reparto</th><th className="px-4 py-3">Ore mese</th><th className="px-4 py-3">Stato</th><th className="px-4 py-3"></th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} onClick={() => setSelectedId(employee.id)} className="cursor-pointer transition hover:bg-primary-tint/40">
                      <td className="px-5 py-4"><Person employee={employee} /></td>
                      <td className="px-4 py-4"><p className="text-sm font-semibold text-ink">{employee.role}</p><p className="mt-0.5 text-xs text-ink-muted">{employee.department}</p></td>
                      <td className="px-4 py-4"><HoursProgress hours={employee.monthlyHours} target={employee.targetHours} /></td>
                      <td className="px-4 py-4"><StatusBadge status={employee.status} /></td>
                      <td className="px-4 py-4 text-ink-muted"><Icon name="chevron" className="size-4" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-border md:hidden">
              {filteredEmployees.map((employee) => (
                <button key={employee.id} type="button" onClick={() => setSelectedId(employee.id)} className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-primary-tint/40">
                  <div className="flex w-full items-center justify-between gap-3"><Person employee={employee} /><StatusBadge status={employee.status} /></div>
                  <div className="flex w-full items-center justify-between gap-4"><p className="truncate text-xs text-ink-secondary">{employee.role} · {employee.department}</p><span className="shrink-0 text-xs font-bold text-ink">{employee.monthlyHours} / {employee.targetHours} h</span></div>
                  <HoursProgress hours={employee.monthlyHours} target={employee.targetHours} />
                </button>
              ))}
            </div>
            {filteredEmployees.length === 0 && <p className="p-8 text-center text-sm text-ink-secondary">Nessun dipendente trovato.</p>}
          </section>
        )
      )}

      {page === "reports" && <ProjectAnalysis employees={employees} entries={entries} />}
      {editorOpen && (
        <EmployeeEditor
          employee={editing}
          employees={employees}
          onClose={() => { setEditorOpen(false); setEditing(null); }}
          onSave={saveEmployee}
        />
      )}
    </div>
  );
}

function ProjectAnalysis({ employees, entries }: { employees: Employee[]; entries: DemoWorkEntry[] }) {
  const [query, setQuery] = useState("");
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<"hours" | "people" | "entries" | null>(null);
  const projects = Array.from(new Set(entries.map((entry) => entry.project)))
    .map((project) => {
      const projectEntries = entries.filter((entry) => entry.project === project);
      const employeeTotals = projectEntries.reduce<Record<string, number>>((totals, entry) => {
        totals[entry.employeeId] = (totals[entry.employeeId] ?? 0) + entry.hours;
        return totals;
      }, {});
      return {
        name: project,
        entries: projectEntries,
        totalHours: projectEntries.reduce((total, entry) => total + entry.hours, 0),
        employeeTotals,
      };
    })
    .sort((a, b) => b.totalHours - a.totalHours);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredProjects = projects.filter((project) => project.name.toLowerCase().includes(normalizedQuery));
  const selectedProject = projects.find((project) => project.name === selectedProjectName);
  const showSearchResults = query.trim().length > 0 && !selectedProject;
  const involvedEmployeeIds = selectedProject ? Object.keys(selectedProject.employeeTotals) : [];
  const visibleEntries = selectedProject?.entries.slice().sort((a, b) => b.date.localeCompare(a.date)) ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-white p-4 shadow-card sm:p-5">
        <label className="relative block">
          <Icon name="search" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedProjectName(null);
              setActiveMetric(null);
            }}
            placeholder="Cerca una commessa..."
            aria-label="Cerca una commessa"
            aria-controls="commessa-search-results"
            aria-expanded={showSearchResults}
            className="min-h-12 w-full rounded-lg border border-border bg-surface-muted/50 pl-10 pr-4 text-sm outline-none transition placeholder:text-ink-muted focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </label>
        {showSearchResults ? (
          <div id="commessa-search-results" role="listbox" aria-label="Risultati commesse" className="mt-2 overflow-hidden rounded-lg border border-border bg-white shadow-card">
            {filteredProjects.length > 0 ? filteredProjects.map((project) => (
              <button
                key={project.name}
                type="button"
                role="option"
                aria-selected={selectedProjectName === project.name}
                onClick={() => {
                  setSelectedProjectName(project.name);
                  setQuery(project.name);
                  setActiveMetric(null);
                }}
                className="flex min-h-14 w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-primary-tint/50 focus-visible:bg-primary-tint/50 focus-visible:outline-none"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-tint text-primary"><Icon name="briefcase" className="size-4" /></span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{project.name}</span>
                <span className="shrink-0 text-xs font-semibold text-ink-secondary">{project.totalHours.toLocaleString("it-IT")} h</span>
                <Icon name="chevron" className="size-4 shrink-0 text-ink-muted" />
              </button>
            )) : (
              <p className="px-4 py-3 text-sm text-ink-secondary">Nessuna commessa trovata.</p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs text-ink-muted">
            {selectedProject ? "Commessa selezionata" : `${projects.length} ${projects.length === 1 ? "commessa disponibile" : "commesse disponibili"} · cerca per vedere i risultati qui sotto`}
          </p>
        )}
      </section>

      {projects.length === 0 ? (
        <section className="rounded-xl border border-border bg-white px-5 py-12 text-center shadow-card">
          <Icon name="briefcase" className="mx-auto size-8 text-ink-muted" />
          <h2 className="mt-3 font-extrabold text-ink">Nessuna commessa registrata</h2>
          <p className="mt-1 text-sm text-ink-secondary">Le commesse appariranno qui dopo l’inserimento delle ore.</p>
        </section>
      ) : !selectedProject ? (
        null
      ) : (
        <div>
            <section className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted/40 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-tint text-primary"><Icon name="briefcase" className="size-4" /></span>
                  <div className="min-w-0"><h2 className="truncate font-extrabold text-ink">{selectedProject.name}</h2><p className="mt-0.5 text-xs text-ink-secondary">Riepilogo commessa</p></div>
                </div>
              </header>
              <div className="grid grid-cols-3 gap-2 border-b border-border p-3 sm:gap-3 sm:p-4">
                {([
                  { id: "hours", label: "Ore totali", value: `${selectedProject.totalHours.toLocaleString("it-IT")} h`, icon: "clock" },
                  { id: "people", label: "Persone", value: involvedEmployeeIds.length.toString(), icon: "people" },
                  { id: "entries", label: "Registrazioni", value: selectedProject.entries.length.toString(), icon: "note" },
                ] as const).map((metric) => (
                  <button
                    key={metric.id}
                    type="button"
                    aria-pressed={activeMetric === metric.id}
                    onClick={() => setActiveMetric((current) => current === metric.id ? null : metric.id)}
                    className={`min-w-0 rounded-lg border p-3 text-left transition sm:p-4 ${
                      activeMetric === metric.id
                        ? "border-primary bg-primary-tint shadow-sm"
                        : "border-border bg-white hover:border-primary/40 hover:bg-surface-muted/50"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span className="truncate text-[11px] font-bold text-ink-secondary sm:text-xs">{metric.label}</span>
                      <Icon name={metric.icon} className="size-4 shrink-0 text-primary" />
                    </span>
                    <span className="mt-2 block truncate text-lg font-extrabold text-ink sm:text-2xl">{metric.value}</span>
                  </button>
                ))}
              </div>

              {activeMetric && (
                <>
                  {activeMetric === "hours" && (
                    <div className="divide-y divide-border">
                      {Object.entries(selectedProject.employeeTotals).map(([employeeId, hours]) => {
                        const employee = employees.find((person) => person.id === employeeId);
                        return (
                          <div key={employeeId} className="flex items-center gap-3 px-4 py-3">
                            <Person employee={employee} compact />
                            <span className="ml-auto whitespace-nowrap text-sm font-extrabold text-ink">{hours.toLocaleString("it-IT")} h</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {activeMetric === "people" && (
                    <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4">
                      {involvedEmployeeIds.map((employeeId) => {
                        const employee = employees.find((person) => person.id === employeeId);
                        const employeeEntries = selectedProject.entries.filter((entry) => entry.employeeId === employeeId);
                        return (
                          <article key={employeeId} className="flex items-center gap-3 rounded-lg border border-border p-3">
                            <Person employee={employee} />
                            <div className="ml-auto text-right">
                              <p className="text-sm font-extrabold text-ink">{selectedProject.employeeTotals[employeeId].toLocaleString("it-IT")} h</p>
                              <p className="text-[11px] text-ink-muted">
                                {employeeEntries.length} {employeeEntries.length === 1 ? "registrazione" : "registrazioni"}
                              </p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                  {activeMetric === "entries" && (
                    <>
                      {visibleEntries.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-ink-secondary">Nessuna registrazione per questa commessa.</p>
                      ) : (
                      <div className="divide-y divide-border">
                        {visibleEntries.slice().sort((a, b) => b.date.localeCompare(a.date)).map((entry) => {
                          const employee = employees.find((person) => person.id === entry.employeeId);
                          return (
                            <div key={entry.id} className="grid gap-2 px-4 py-3.5 sm:grid-cols-[minmax(150px,0.8fr)_minmax(140px,1.2fr)_100px_70px_95px] sm:items-center sm:px-5">
                              <Person employee={employee} />
                              <p className="min-w-0 text-sm font-semibold text-ink">{entry.activity}</p>
                              <span className="text-xs text-ink-secondary">{formatDate(entry.date)}</span>
                              <span className="text-sm font-extrabold text-ink">{entry.hours.toLocaleString("it-IT")} h</span>
                              <StatusBadge status={entry.status} />
                            </div>
                          );
                        })}
                      </div>
                      )}
                      <footer className="flex items-center justify-between border-t border-border bg-surface-muted/40 px-4 py-3 text-xs sm:px-5">
                        <span className="font-semibold text-ink-secondary">Totale registrato</span>
                        <span className="font-extrabold text-ink">{selectedProject.totalHours.toLocaleString("it-IT")} ore</span>
                      </footer>
                    </>
                  )}
                </>
              )}
            </section>
        </div>
      )}
    </div>
  );
}

function Person({ employee, compact = false }: { employee?: Employee; compact?: boolean }) {
  if (!employee) return <span className="text-sm text-ink-muted">Dipendente</span>;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={`grid size-10 shrink-0 place-items-center rounded-full text-xs font-extrabold ${employee.color}`}>{employee.initials}</span>
      <div className="min-w-0"><p className="truncate text-sm font-bold text-ink">{employee.name}</p>{!compact && <p className="truncate text-xs text-ink-secondary">{employee.email}</p>}</div>
    </div>
  );
}

function HoursProgress({ hours, target }: { hours: number; target: number }) {
  const percentage = Math.min(100, Math.round((hours / Math.max(target, 1)) * 100));
  return <div className="min-w-20"><div className="mb-1.5 flex justify-between text-[10px]"><span className="font-bold text-ink">{hours} h</span><span className="text-ink-muted">{percentage}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} /></div></div>;
}

function EmployeeDetails({
  employee,
  entries,
  onBack,
  onEdit,
}: {
  employee: Employee;
  entries: DemoWorkEntry[];
  onBack: () => void;
  onEdit: () => void;
}) {
  const info = [["Email", employee.email], ["Telefono", employee.phone], ["Reparto", employee.department], ["Sede", employee.location], ["Tipo di contratto", employee.contract], ["Data di assunzione", formatDate(employee.startDate)]];
  return (
    <>
      <button type="button" onClick={onBack} className="flex min-h-9 items-center gap-2 text-sm font-bold text-ink-secondary hover:text-primary"><Icon name="chevron" className="size-4 rotate-180" /> Torna all’elenco</button>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5 sm:p-6">
            <div className="flex items-center gap-4"><span className={`grid size-16 place-items-center rounded-2xl text-lg font-extrabold ${employee.color}`}>{employee.initials}</span><div><h2 className="text-xl font-extrabold text-ink">{employee.name}</h2><p className="mt-1 text-sm text-ink-secondary">{employee.role}</p><div className="mt-2"><StatusBadge status={employee.status} /></div></div></div>
            <button type="button" onClick={onEdit} className="flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-bold text-ink-secondary hover:bg-surface-muted"><Icon name="edit" className="size-4" /> Modifica</button>
          </div>
          <div className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
            {info.map(([label, value]) => <div key={label}><p className="text-xs font-semibold text-ink-muted">{label}</p><p className="mt-1.5 break-words text-sm font-semibold text-ink">{value}</p></div>)}
          </div>
        </section>
        <section className="rounded-xl border border-border bg-white p-5 shadow-card sm:p-6">
          <h2 className="font-extrabold text-ink">Riepilogo di ottobre</h2><p className="mt-1 text-xs text-ink-secondary">Avanzamento ore mensili</p>
          <div className="mt-5 flex items-end justify-between"><strong className="text-3xl font-extrabold text-ink">{employee.monthlyHours}<span className="ml-1 text-sm font-semibold text-ink-muted">/ {employee.targetHours} h</span></strong><span className="text-sm font-bold text-primary">{Math.round((employee.monthlyHours / employee.targetHours) * 100)}%</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, employee.monthlyHours / employee.targetHours * 100)}%` }} /></div>
          <div className="mt-7 border-t border-border pt-5"><h3 className="text-sm font-bold text-ink">Registrazioni recenti</h3>
            <div className="mt-3 divide-y divide-border">
              {entries.length === 0 ? <p className="py-5 text-sm text-ink-secondary">Nessuna registrazione demo disponibile.</p> : entries.map((entry) => <div key={entry.id} className="flex items-center gap-3 py-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-tint text-primary"><Icon name="briefcase" className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{entry.project}</p><p className="mt-0.5 text-xs text-ink-muted">{formatDate(entry.date)} · {entry.activity}</p></div><div className="text-right"><p className="text-sm font-extrabold text-ink">{entry.hours} h</p><StatusBadge status={entry.status} /></div></div>)}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function EmployeeEditor({
  employee,
  employees,
  onClose,
  onSave,
}: {
  employee: Employee | null;
  employees: Employee[];
  onClose: () => void;
  onSave: (employee: Employee) => void;
}) {
  const [name, setName] = useState(employee?.name ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [role, setRole] = useState(employee?.role ?? "");
  const [department, setDepartment] = useState(employee?.department ?? "");
  const [contract, setContract] = useState(employee?.contract ?? "Tempo pieno");
  const [status, setStatus] = useState<EmployeeStatus>(employee?.status ?? "Attivo");
  const [location, setLocation] = useState(employee?.location ?? "");
  const [startDate, setStartDate] = useState(employee?.startDate ?? new Date().toISOString().slice(0, 10));
  const [monthlyHours, setMonthlyHours] = useState(String(employee?.monthlyHours ?? 0));
  const [targetHours, setTargetHours] = useState(String(employee?.targetHours ?? 168));
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (employees.some((item) => item.id !== employee?.id && item.email.toLowerCase() === email.trim().toLowerCase())) {
      setError("Esiste già un dipendente con questa email.");
      return;
    }
    setError("");
    const initials = name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    const id = employee?.id ?? `employee-${Date.now()}`;
    onSave({
      id, name: name.trim(), email: email.trim(), phone: phone.trim(), role: role.trim(),
      department: department.trim(), contract, status, location: location.trim(), startDate,
      monthlyHours: Number(monthlyHours), targetHours: Number(targetHours), initials,
      color: employee?.color ?? "bg-emerald-100 text-emerald-800",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="employee-editor-title" className="max-h-[94vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-primary">{employee ? "Scheda dipendente" : "Nuovo profilo"}</p><h2 id="employee-editor-title" className="mt-1 text-xl font-extrabold text-ink">{employee ? "Modifica dipendente" : "Aggiungi dipendente"}</h2></div><button type="button" onClick={onClose} aria-label="Chiudi" className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted"><Icon name="close" className="size-5" /></button></div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo"><input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></Field>
            <Field label="Email"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></Field>
            <Field label="Telefono"><input value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} /></Field>
            <Field label="Ruolo"><input required value={role} onChange={(event) => setRole(event.target.value)} className={inputClass} /></Field>
            <Field label="Reparto"><input required value={department} onChange={(event) => setDepartment(event.target.value)} className={inputClass} /></Field>
            <Field label="Sede"><input value={location} onChange={(event) => setLocation(event.target.value)} className={inputClass} /></Field>
            <Field label="Contratto"><select value={contract} onChange={(event) => setContract(event.target.value)} className={inputClass}><option>Tempo pieno</option><option>Part-time</option><option>Tempo determinato</option><option>Collaboratore</option></select></Field>
            <Field label="Stato"><select value={status} onChange={(event) => setStatus(event.target.value as EmployeeStatus)} className={inputClass}><option>Attivo</option><option>In ferie</option><option>Inattivo</option></select></Field>
            <Field label="Data di assunzione"><input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass} /></Field>
            <Field label="Ore mensili registrate"><input required type="number" min="0" max="300" value={monthlyHours} onChange={(event) => setMonthlyHours(event.target.value)} className={inputClass} /></Field>
            <Field label="Obiettivo ore mensile"><input required type="number" min="1" max="300" value={targetHours} onChange={(event) => setTargetHours(event.target.value)} className={inputClass} /></Field>
          </div>
          {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-border px-4 text-sm font-bold text-ink-secondary hover:bg-surface-muted">Annulla</button><button type="submit" className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-white hover:bg-primary-hover">{employee ? "Salva modifiche" : "Crea dipendente"}</button></div>
        </form>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-bold text-ink-secondary">{label}{children}</label>;
}
