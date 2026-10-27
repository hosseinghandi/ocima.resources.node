import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Icon } from "../components/Icon";
import { ActionButton } from "../components/ActionButton";
import { FilterField, FilterPanel, filterFieldClass } from "../components/FilterPanel";
import { AdminResetDialog } from "../components/PasswordDialogs";
import { getAdministrators } from "../services/people";
import { formatDateTime } from "../utils/format";
import { useAllTimeEntries } from "../hooks/useAllTimeEntries";
import { useEmployees } from "../hooks/useEmployees";
import { useActivities } from "../hooks/useActivities";
import { departmentLabel } from "../../backend/contracts/activities";
import {
  employeeStatuses,
  type Administrator,
  type Employee,
  type EmployeeInput,
  type EmployeeStatus,
  type LoginRole,
} from "../../backend/contracts/people";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-border-strong bg-white px-3 text-sm font-medium text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function currentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: EmployeeStatus }) {
  const styles =
    status === "Attivo"
      ? "bg-emerald-50 text-emerald-700"
      : status === "In ferie"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${styles}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function EmployeesPage({ adminId }: { adminId: number }) {
  const { employees, loading, error, add, edit, remove, refresh, clearError } = useEmployees();
  const { entries } = useAllTimeEntries();
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [adminsVersion, setAdminsVersion] = useState(0);
  const [resetTarget, setResetTarget] = useState<{ role: LoginRole; id: number; name: string } | null>(null);
  const [resetNotice, setResetNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getAdministrators(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setAdministrators(result);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [adminsVersion]);

  const pendingRequests = [
    ...employees
      .filter((item) => item.resetRequested)
      .map((item) => ({ role: "employee" as LoginRole, id: item.id, name: item.name, at: item.resetRequestedAt, detail: departmentLabel(item.department) })),
    ...administrators
      .filter((item) => item.resetRequested)
      .map((item) => ({ role: "admin" as LoginRole, id: item.id, name: item.name, at: item.resetRequestedAt, detail: "Amministratore" })),
  ].sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const monthHours = useMemo(() => {
    const month = currentMonth();
    const totals = new Map<number, number>();
    for (const entry of entries) {
      if (entry.date.startsWith(month)) {
        totals.set(entry.employeeId, (totals.get(entry.employeeId) ?? 0) + entry.hours);
      }
    }
    return totals;
  }, [entries]);

  const { catalog } = useActivities();
  const departments = catalog.map((item) => item.reparto);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("it");
    return employees.filter(
      (item) =>
        (!departmentFilter || item.department === departmentFilter) &&
        (!statusFilter || item.status === statusFilter) &&
        (!normalized ||
          `${item.name} ${departmentLabel(item.department)} ${item.email} ${item.phone}`
            .toLocaleLowerCase("it")
            .includes(normalized)),
    );
  }, [employees, query, departmentFilter, statusFilter]);

  async function handleSave(input: EmployeeInput) {
    setSaving(true);
    try {
      if (editing) await edit(editing.id, input);
      else await add(input);
      setFormOpen(false);
      setEditing(null);
    } catch {
      // The hook exposes the message through `error`.
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(item: Employee) {
    if (!window.confirm(`Vuoi eliminare il dipendente ${item.name}?`)) return;
    setRemovingId(item.id);
    try {
      await remove(item.id);
    } catch {
      // The hook exposes the message through `error`.
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Spazio amministratore</p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Dipendenti</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Archivio dei dipendenti: i dati compilano in automatico l’inserimento ore.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            clearError();
            setFormOpen(true);
          }}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary-hover sm:w-auto"
        >
          <Icon name="plus" className="size-4" /> Aggiungi dipendente
        </button>
      </header>

      {error && !formOpen && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">
          <span>{error}</span>
          <span className="flex shrink-0 gap-3 font-bold">
            {employees.length === 0 && (
              <button type="button" onClick={() => void refresh()} className="underline">
                Riprova
              </button>
            )}
            <button type="button" onClick={clearError}>Chiudi</button>
          </span>
        </div>
      )}

      {resetNotice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
          <span>{resetNotice}</span>
          <button type="button" onClick={() => setResetNotice("")} className="shrink-0 font-bold">Chiudi</button>
        </div>
      )}
      {pendingRequests.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50" role="status" aria-label="Richieste di reset password">
          <header className="px-4 py-3 text-sm font-extrabold text-amber-900 sm:px-5">
            {pendingRequests.length} {pendingRequests.length === 1 ? "richiesta" : "richieste"} di reset password in attesa
          </header>
          <ul className="divide-y divide-amber-200 border-t border-amber-200">
            {pendingRequests.map((request) => (
              <li key={`${request.role}-${request.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink">{request.name}</span>
                  <span className="block text-xs text-amber-900">
                    {request.detail} · richiesta del {request.at ? formatDateTime(request.at) : "—"}
                  </span>
                </span>
                <ActionButton
                  variant="reset"
                  onClick={() => setResetTarget({ role: request.role, id: request.id, name: request.name })}
                  className="min-h-10 text-sm"
                >
                  Reimposta password
                </ActionButton>
              </li>
            ))}
          </ul>
        </section>
      )}

      <FilterPanel
        active={Boolean(query || departmentFilter || statusFilter)}
        onReset={() => {
          setQuery("");
          setDepartmentFilter("");
          setStatusFilter("");
        }}
      >
        <FilterField label="Dipendente (nome, email o telefono)" className="sm:col-span-2">
          <span className="relative block">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Es. Rossi"
              aria-label="Cerca dipendente"
              className={`${filterFieldClass} pl-9`}
            />
          </span>
        </FilterField>
        <FilterField label="Reparto">
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className={filterFieldClass}>
            <option value="">Tutti</option>
            {departments.map((item) => <option key={item} value={item}>{departmentLabel(item)}</option>)}
          </select>
        </FilterField>
        <FilterField label="Stato">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={filterFieldClass}>
            <option value="">Tutti</option>
            {employeeStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </FilterField>
      </FilterPanel>

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-extrabold text-ink">Tutti i dipendenti</h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {loading ? "Caricamento..." : `${filtered.length} di ${employees.length} profili`}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-ink-secondary">Caricamento archivio...</p>
        ) : employees.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-secondary">Nessun dipendente registrato.</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-secondary">Nessun dipendente corrisponde alla ricerca.</p>
        ) : (
          <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] text-left [&_td]:px-3 [&_th]:px-3">
              <thead className="bg-surface-muted/70 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-5 py-3">Dipendente</th>
                  <th className="px-4 py-3">Reparto</th>
                  <th className="px-4 py-3">Contatti</th>
                  <th className="px-4 py-3">Ore mese</th>
                  <th className="px-4 py-3">Stato</th>
                  <th className="px-4 py-3"><span className="sr-only">Azioni</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-primary-tint/30">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-tint text-xs font-extrabold text-primary-dark">
                          {initials(item.name)}
                        </span>
                        <span className="text-sm font-bold text-ink">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink-secondary">{departmentLabel(item.department)}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-secondary">
                      <span className="block">{item.email || "—"}</span>
                      {item.phone && <span className="block text-xs text-ink-muted">{item.phone}</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-bold text-ink">
                      {(monthHours.get(item.id) ?? 0).toLocaleString("it-IT")} h
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={item.status} />
                      {item.resetRequested && (
                        <span className="mt-1 block text-[11px] font-bold text-amber-700">Reset password richiesto</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <ActionButton
                          variant="reset"
                          onClick={() => setResetTarget({ role: "employee", id: item.id, name: item.name })}
                          aria-label={`Reimposta password di ${item.name}`}
                        >
                          Reimposta password
                        </ActionButton>
                        <ActionButton
                          variant="edit"
                          onClick={() => {
                            clearError();
                            setEditing(item);
                            setFormOpen(true);
                          }}
                          aria-label={`Modifica ${item.name}`}
                        >
                          Modifica
                        </ActionButton>
                        <ActionButton
                          variant="delete"
                          onClick={() => void handleRemove(item)}
                          disabled={removingId === item.id}
                          aria-label={`Elimina ${item.name}`}
                        >
                          {removingId === item.id ? "Eliminazione..." : "Elimina"}
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-border md:hidden">
            {filtered.map((item) => (
              <li key={item.id} className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-tint text-xs font-extrabold text-primary-dark">
                    {initials(item.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{item.name}</span>
                    <span className="block truncate text-xs text-ink-secondary">{departmentLabel(item.department)}</span>
                  </span>
                  <span className="shrink-0 text-sm font-extrabold text-ink">
                    {(monthHours.get(item.id) ?? 0).toLocaleString("it-IT")} h
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <StatusBadge status={item.status} />
                  {item.resetRequested && <span className="text-[11px] font-bold text-amber-700">Reset password richiesto</span>}
                </div>
                {(item.email || item.phone) && (
                  <p className="mt-1.5 break-all text-xs text-ink-muted">{[item.email, item.phone].filter(Boolean).join(" · ")}</p>
                )}
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  <ActionButton
                    variant="reset"
                    onClick={() => setResetTarget({ role: "employee", id: item.id, name: item.name })}
                    className="min-h-10 justify-center px-2"
                  >
                    Password
                  </ActionButton>
                  <ActionButton
                    variant="edit"
                    onClick={() => {
                      clearError();
                      setEditing(item);
                      setFormOpen(true);
                    }}
                    className="min-h-10 justify-center px-2"
                  >
                    Modifica
                  </ActionButton>
                  <ActionButton
                    variant="delete"
                    onClick={() => void handleRemove(item)}
                    disabled={removingId === item.id}
                    className="min-h-10 justify-center px-2"
                  >
                    Elimina
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
          </>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
        <header className="border-b border-border px-4 py-3.5 sm:px-5">
          <h2 className="font-extrabold text-ink">Amministratori</h2>
          <p className="mt-0.5 text-xs text-ink-secondary">Account con accesso completo.</p>
        </header>
        <div className="divide-y divide-border">
          {administrators.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-tint text-xs font-extrabold text-primary-dark">
                {initials(item.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink">{item.name}</span>
                {item.resetRequested && <span className="block text-[11px] font-bold text-amber-700">Reset password richiesto</span>}
              </span>
              <ActionButton
                variant="reset"
                onClick={() => setResetTarget({ role: "admin", id: item.id, name: item.name })}
              >
                Reimposta password
              </ActionButton>
            </div>
          ))}
        </div>
      </section>

      {resetTarget && (
        <AdminResetDialog
          adminId={adminId}
          role={resetTarget.role}
          id={resetTarget.id}
          name={resetTarget.name}
          onClose={() => setResetTarget(null)}
          onDone={() => {
            setResetNotice(`Password di ${resetTarget.name} ripristinata a quella iniziale.`);
            setAdminsVersion((value) => value + 1);
            void refresh();
          }}
        />
      )}

      {formOpen && (
        <EmployeeForm
          employee={editing}
          departments={departments}
          error={error}
          saving={saving}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
            clearError();
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function EmployeeForm({
  employee,
  departments,
  error,
  saving,
  onClose,
  onSave,
}: {
  employee: Employee | null;
  departments: string[];
  error: string;
  saving: boolean;
  onClose: () => void;
  onSave: (input: EmployeeInput) => Promise<void>;
}) {
  const [name, setName] = useState(employee?.name ?? "");
  const [department, setDepartment] = useState(employee?.department ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [status, setStatus] = useState<EmployeeStatus>(employee?.status ?? "Attivo");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave({
      name: name.trim(),
      department: department.trim(),
      email: email.trim(),
      phone: phone.trim(),
      status,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-form-title"
        className="max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-primary">{employee ? "Modifica record" : "Nuovo record"}</p>
            <h2 id="employee-form-title" className="mt-1 text-xl font-extrabold text-ink">
              {employee ? "Modifica dipendente" : "Aggiungi dipendente"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Chiudi"
            className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted disabled:opacity-50"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">
              {error}
            </p>
          )}
          <label className="block text-sm font-semibold text-ink">
            Nome completo
            <input required autoFocus maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-ink">
              Reparto
              <select required value={department} onChange={(event) => setDepartment(event.target.value)} className={inputClass}>
                <option value="" disabled>Seleziona reparto</option>
                {departments.map((item) => (
                  <option key={item} value={item}>{departmentLabel(item)}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-ink">
              Stato
              <select value={status} onChange={(event) => setStatus(event.target.value as EmployeeStatus)} className={inputClass}>
                {employeeStatuses.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-ink">
              Email <span className="font-normal text-ink-muted">· facoltativa</span>
              <input type="email" maxLength={160} value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm font-semibold text-ink">
              Telefono <span className="font-normal text-ink-muted">· facoltativo</span>
              <input maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} />
            </label>
          </div>
          {!employee && (
            <p className="text-xs text-ink-muted">Il nuovo dipendente accede con la password iniziale ocima2026.</p>
          )}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-lg border border-border px-4 text-sm font-bold text-ink-secondary hover:bg-surface-muted disabled:opacity-50">
              Annulla
            </button>
            <button type="submit" disabled={saving} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50">
              {saving ? "Salvataggio..." : employee ? "Salva modifiche" : "Crea dipendente"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
