import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Icon } from "../components/Icon";
import { AdminResetDialog } from "../components/PasswordDialogs";
import { getAdministrators } from "../services/people";
import { formatDateTime } from "../utils";
import { useAllTimeEntries } from "../hooks/useAllTimeEntries";
import { useEmployees } from "../hooks/useEmployees";
import { useActivities } from "../hooks/useActivities";
import { departmentLabel } from "../../shared/activities";
import {
  employeeStatuses,
  type Administrator,
  type Employee,
  type EmployeeInput,
  type EmployeeStatus,
  type LoginRole,
} from "../../shared/people";

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
    if (!normalized) return employees;
    return employees.filter((item) =>
      `${item.name} ${departmentLabel(item.department)} ${item.email} ${item.phone}`.toLocaleLowerCase("it").includes(normalized),
    );
  }, [employees, query]);

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
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Spazio amministratore</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Dipendenti</h1>
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
                <button
                  type="button"
                  onClick={() => setResetTarget({ role: request.role, id: request.id, name: request.name })}
                  className="min-h-10 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-700"
                >
                  Reimposta password
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-extrabold text-ink">Tutti i dipendenti</h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {loading ? "Caricamento..." : `${filtered.length} di ${employees.length} profili`}
            </p>
          </div>
          <label className="relative block w-full sm:w-72">
            <Icon name="search" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca dipendente o reparto..."
              aria-label="Cerca dipendente"
              className="min-h-10 w-full rounded-lg border border-border bg-surface-muted/60 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-ink-secondary">Caricamento archivio...</p>
        ) : employees.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-secondary">Nessun dipendente registrato.</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-secondary">Nessun dipendente corrisponde alla ricerca.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
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
                      <button
                        type="button"
                        onClick={() => setResetTarget({ role: "employee", id: item.id, name: item.name })}
                        aria-label={`Reimposta password di ${item.name}`}
                        className={`rounded-lg px-3 py-2 text-xs font-bold transition hover:bg-amber-50 ${item.resetRequested ? "text-amber-700" : "text-ink-secondary"}`}
                      >
                        Reimposta password
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearError();
                          setEditing(item);
                          setFormOpen(true);
                        }}
                        aria-label={`Modifica ${item.name}`}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary-tint"
                      >
                        Modifica
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRemove(item)}
                        disabled={removingId === item.id}
                        aria-label={`Elimina ${item.name}`}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {removingId === item.id ? "Eliminazione..." : "Elimina"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              <button
                type="button"
                onClick={() => setResetTarget({ role: "admin", id: item.id, name: item.name })}
                className="rounded-lg px-3 py-2 text-xs font-bold text-ink-secondary transition hover:bg-amber-50"
              >
                Reimposta password
              </button>
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
        className="max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-7"
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
