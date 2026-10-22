import { useMemo, useState, type FocusEvent, type FormEvent } from "react";
import type {
  CreateTimeEntryInput,
  TimeEntry,
} from "../../shared/timeEntry";
import type { Commessa } from "../../shared/commessa";
import type { Employee } from "../../shared/people";
import {
  commessaSearchText,
  formatCommessaCode,
  formatCommessaLabel,
} from "../../shared/commessa";
import { useCommesse } from "../hooks/useCommesse";
import { useActivities } from "../hooks/useActivities";
import { departmentLabel } from "../../shared/activities";
import { Icon } from "./Icon";

function localDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

const inputClass =
  "mt-2 min-h-12 w-full rounded-lg border border-border-strong bg-surface px-3.5 text-sm font-medium text-ink outline-none transition placeholder:text-ink-muted hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10";

export function HoursEntryForm({
  employee,
  onSave,
}: {
  employee: Employee;
  onSave:  (input: CreateTimeEntryInput) => Promise<TimeEntry>;
}) {
  const {
    commesse,
    loading: commesseLoading,
    error: commesseError,
  } = useCommesse();
  const [hours, setHours] = useState("8");
  const { catalog, loading: activitiesLoading } = useActivities();
  const activityOptions =
    catalog.find((item) => item.reparto === employee.department)?.attivita ?? [];
  const [date, setDate] = useState(localDate);
  const [project, setProject] = useState("");
  const [selectedProject, setSelectedProject] = useState<Commessa | null>(null);
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const [activity, setActivity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const matchingProjects = useMemo(() => {
    const normalized = project.trim().toLocaleLowerCase("it");
    return commesse.filter((item) => commessaSearchText(item).includes(normalized));
  }, [commesse, project]);

  function closeProjectSearch(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setProjectSearchOpen(false);
    }
  }

  function selectProject(item: Commessa) {
    setSelectedProject(item);
    setProject(formatCommessaLabel(item));
    setProjectSearchOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    if (!selectedProject) {
      setError("Seleziona una commessa presente nell'archivio.");
      setSaving(false);
      return;
    }
    try {
      await onSave({
        employeeId: employee.id,
        date,
        project: formatCommessaCode(selectedProject),
        activity,
        hours: Number(hours),
        notes,
      });
      setMessage("Ore registrate correttamente.");
      setActivity("");
      setNotes("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossibile salvare le ore.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-card sm:p-7">
      <div className="mb-6 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-tint text-primary">
          <Icon name="clock" className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-ink">
            Nuova registrazione
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Aggiungi le ore lavorate a una commessa.
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-semibold text-ink-secondary">
          Dipendente
          <input
            readOnly
            value={`${employee.name} · ${departmentLabel(employee.department)}`}
            className={`${inputClass} cursor-default bg-surface-muted`}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-ink-secondary">
            Data
            <input
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-semibold text-ink-secondary">
            Ore lavorate
            <input
              required
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <div className="relative" onBlur={closeProjectSearch}>
          <label className="block text-sm font-semibold text-ink-secondary">
            Commessa
            <span className="relative block">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                required
                maxLength={400}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={projectSearchOpen}
                aria-controls="hours-project-options"
                aria-label="Cerca una commessa nell'archivio"
                value={project}
                onFocus={() => setProjectSearchOpen(true)}
                onChange={(event) => {
                  setProject(event.target.value);
                  setSelectedProject(null);
                  setProjectSearchOpen(true);
                }}
                placeholder="Cerca per codice, denominazione o cliente"
                className={`${inputClass} pl-10`}
              />
            </span>
          </label>
          {projectSearchOpen && (
            <div id="hours-project-options" role="listbox" aria-label="Commesse disponibili" className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-white py-1 shadow-lg">
              {matchingProjects.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={selectedProject?.id === item.id}
                  onClick={() => selectProject(item)}
                  className="flex min-h-11 w-full items-center gap-3 px-3.5 py-2 text-left text-sm text-ink transition hover:bg-primary-tint/60 focus-visible:bg-primary-tint/60 focus-visible:outline-none"
                >
                  <Icon name="briefcase" className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {formatCommessaLabel(item)}
                    </span>
                    {item.cliente && (
                      <span className="block truncate text-xs text-ink-muted">
                        {item.cliente}
                      </span>
                    )}
                  </span>
                  {selectedProject?.id === item.id && <Icon name="check" className="size-4 shrink-0 text-primary" />}
                </button>
              ))}
              {matchingProjects.length === 0 && (
                <p className="px-3.5 py-3 text-sm text-ink-muted">Nessuna commessa disponibile.</p>
              )}
            </div>
          )}
          <p className="mt-1.5 text-xs text-ink-muted">
            {commesseError
              ? "Archivio commesse non disponibile: riprova più tardi."
              : commesseLoading
                ? "Caricamento archivio commesse..."
                : "Scegli una commessa dall’archivio."}
          </p>
        </div>
        <label className="block text-sm font-semibold text-ink-secondary">
          Attività
          <select
            required
            value={activity}
            onChange={(event) => setActivity(event.target.value)}
            disabled={activityOptions.length === 0}
            className={inputClass}
          >
            <option value="" disabled>
              {activitiesLoading
                ? "Caricamento attività..."
                : activityOptions.length === 0
                  ? "Nessuna attività per il tuo reparto"
                  : "Seleziona un'attività"}
            </option>
            {activityOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-ink-secondary">
          Note <span className="font-normal text-ink-muted">· facoltative</span>
          <textarea
            maxLength={1000}
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Aggiungi un dettaglio utile..."
            className={`${inputClass} resize-y py-3`}
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-800" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg bg-primary-tint px-3.5 py-2.5 text-sm font-semibold text-primary-dark" role="status">
            {message}
          </p>
        )}
        <button
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
          type="submit"
          disabled={saving}
        >
          <Icon name="plus" className="size-4" />
          {saving ? "Salvataggio..." : "Registra ore"}
        </button>
      </form>
    </section>
  );
}
