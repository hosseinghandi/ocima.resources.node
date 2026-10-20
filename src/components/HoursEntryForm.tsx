import { useState, type FormEvent } from "react";
import { createTimeEntry } from "../services/timeEntries";
import type { TimeEntry } from "../../shared/timeEntry";
import { Icon } from "./Icon";

function localDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

const inputClass =
  "mt-2 min-h-12 w-full rounded-lg border border-border-strong bg-surface px-3.5 text-sm font-medium text-ink outline-none transition placeholder:text-ink-muted hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10";

export function HoursEntryForm({
  onSaved,
}: {
  onSaved: (entry: TimeEntry) => void;
}) {
  const [hours, setHours] = useState("8");
  const [date, setDate] = useState(localDate);
  const [project, setProject] = useState("");
  const [activity, setActivity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const entry = await createTimeEntry({
        date,
        project,
        activity,
        hours: Number(hours),
        notes,
      });
      onSaved(entry);
      setMessage("Ore registrate correttamente.");
      setProject("");
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
        <label className="block text-sm font-semibold text-ink-secondary">
          Commessa
          <input
            required
            maxLength={120}
            value={project}
            onChange={(event) => setProject(event.target.value)}
            placeholder="Es. MMS-3000"
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-semibold text-ink-secondary">
          Attività
          <input
            required
            maxLength={160}
            value={activity}
            onChange={(event) => setActivity(event.target.value)}
            placeholder="Es. Sviluppo software"
            className={inputClass}
          />
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
