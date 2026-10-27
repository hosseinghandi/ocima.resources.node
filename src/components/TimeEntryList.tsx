import { useState, type FormEvent, type ReactNode } from "react";
import type { CreateTimeEntryInput, TimeEntry } from "../../backend/contracts/timeEntry";
import { formatCommessaCode, formatCommessaLabel } from "../../backend/contracts/commessa";
import { useActivities } from "../hooks/useActivities";
import { useCommesse } from "../hooks/useCommesse";
import { useEmployees } from "../hooks/useEmployees";
import { formatDate, formatDateTime, formatHours } from "../utils/format";
import { ActionButton } from "./ActionButton";
import { Icon } from "./Icon";

const fieldClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-ink">{title}</h2>
          <button
            type="button"
            aria-label="Chiudi"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-ink-secondary hover:bg-surface-muted"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}

function EditDialog({
  entry,
  onSave,
  onClose,
}: {
  entry: TimeEntry;
  onSave: (id: number, input: CreateTimeEntryInput) => Promise<TimeEntry>;
  onClose: () => void;
}) {
  const { commesse } = useCommesse();
  const { catalog } = useActivities();
  const { employees } = useEmployees();
  const department = employees.find((item) => item.id === entry.employeeId)?.department;
  const activities = catalog.find((item) => item.reparto === department)?.attivita ?? [entry.activity];
  const [date, setDate] = useState(entry.date);
  const [project, setProject] = useState(entry.project);
  const [activity, setActivity] = useState(entry.activity);
  const [hours, setHours] = useState(String(entry.hours));
  const [notes, setNotes] = useState(entry.notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(entry.id, {
        employeeId: entry.employeeId,
        date,
        project: project.trim(),
        activity,
        hours: Number(hours),
        notes,
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossibile salvare le ore.");
      setSaving(false);
    }
  }

  return (
    <Dialog title="Modifica registrazione" onClose={saving ? () => {} : onClose}>
      <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-3.5">
        <label className="block text-sm font-bold text-ink">
          Commessa
          <input
            required
            list="edit-commesse"
            value={project}
            onChange={(event) => setProject(event.target.value)}
            className={fieldClass}
          />
          <datalist id="edit-commesse">
            {commesse.map((item) => (
              <option key={item.id} value={formatCommessaCode(item)}>
                {formatCommessaLabel(item)}
              </option>
            ))}
          </datalist>
        </label>
        <label className="block text-sm font-bold text-ink">
          Attività
          <select required value={activity} onChange={(event) => setActivity(event.target.value)} className={fieldClass}>
            {activities.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-bold text-ink">
            Data
            <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-sm font-bold text-ink">
            Ore
            <input
              required
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        <label className="block text-sm font-bold text-ink">
          Note
          <textarea
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={`${fieldClass} py-2.5`}
          />
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-11 rounded-lg border border-border px-4 text-sm font-bold text-ink-secondary hover:bg-surface-muted disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? "Salvataggio..." : "Salva modifiche"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function TimeEntryList({
  employeeId,
  entries,
  loading,
  onUpdate,
  onDelete,
}: {
  employeeId: number;
  entries: TimeEntry[];
  loading: boolean;
  onUpdate: (id: number, input: CreateTimeEntryInput) => Promise<TimeEntry>;
  onDelete: (entry: TimeEntry) => Promise<void>;
}) {
  const [selected, setSelected] = useState<TimeEntry | null>(null);
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const current = selected ? entries.find((item) => item.id === selected.id) ?? null : null;

  async function remove(entry: TimeEntry) {
    if (!window.confirm(`Vuoi eliminare la registrazione del ${formatDate(entry.date)} (${entry.project})?`)) return;
    setRemovingId(entry.id);
    setError("");
    try {
      await onDelete(entry);
      setSelected(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossibile eliminare la registrazione.");
    } finally {
      setRemovingId(null);
    }
  }

  function actions(entry: TimeEntry) {
    return (
      <>
        <ActionButton variant="edit" aria-label={`Modifica registrazione ${entry.project}`} onClick={() => {
            setSelected(null);
            setEditing(entry);
          }}>
          Modifica
        </ActionButton>
        <ActionButton
          variant="delete"
          aria-label={`Elimina registrazione ${entry.project}`}
          disabled={removingId === entry.id}
          onClick={() => void remove(entry)}
        >
          {removingId === entry.id ? "Eliminazione..." : "Elimina"}
        </ActionButton>
      </>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="font-extrabold text-ink">Registrazioni</h2>
          <p className="mt-0.5 text-xs text-ink-secondary">
            {entries.length} {entries.length === 1 ? "voce" : "voci"} nel periodo · tocca una riga per i dettagli
          </p>
        </div>
        <span className="grid size-9 place-items-center rounded-lg bg-primary-tint text-primary">
          <Icon name="calendar" className="size-[18px]" />
        </span>
      </div>
      {error && (
        <p role="alert" className="border-b border-border bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <p className="px-5 py-8 text-center text-sm text-ink-secondary">Caricamento registrazioni...</p>
      ) : entries.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-surface-muted text-ink-muted">
            <Icon name="note" className="size-5" />
          </span>
          <p className="mt-3 text-sm font-bold text-ink">Ancora nessuna registrazione</p>
          <p className="mt-1 text-xs text-ink-secondary">Le ore inserite appariranno qui.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-surface-muted sm:px-5">
              <button
                type="button"
                onClick={() => setSelected(entry)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
                  <Icon name="briefcase" className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-bold text-ink">{entry.project}</span>
                  <span className="text-ink-secondary"> · {entry.activity}</span>
                </span>
                <span className="hidden whitespace-nowrap text-xs text-ink-muted sm:block">{formatDate(entry.date)}</span>
                <span className="whitespace-nowrap rounded-md bg-surface-muted px-2 py-1 text-sm font-extrabold text-ink">
                  {formatHours(entry.hours)}
                </span>
              </button>
              <div className="hidden shrink-0 gap-2 sm:flex">{actions(entry)}</div>
            </li>
          ))}
        </ul>
      )}

      {current && (
        <Dialog title="Dettaglio registrazione" onClose={() => setSelected(null)}>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5">
            <Detail label="Data">{formatDate(current.date)}</Detail>
            <Detail label="Ore">{formatHours(current.hours)}</Detail>
            <div className="col-span-2">
              <Detail label="Commessa">{current.project}</Detail>
            </div>
            <div className="col-span-2">
              <Detail label="Attività">{current.activity}</Detail>
            </div>
            <div className="col-span-2">
              <Detail label="Note">{current.notes || "Nessuna nota"}</Detail>
            </div>
            <div className="col-span-2">
              <Detail label="Registrata il">{formatDateTime(current.createdAt)}</Detail>
            </div>
          </dl>
          <div className="mt-5 flex justify-end gap-2">{actions(current)}</div>
        </Dialog>
      )}
      {editing && employeeId === editing.employeeId && (
        <EditDialog entry={editing} onSave={onUpdate} onClose={() => setEditing(null)} />
      )}
    </section>
  );
}
