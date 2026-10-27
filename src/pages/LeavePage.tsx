import { useMemo, useState, type FormEvent } from "react";
import { FilterField, FilterPanel, filterFieldClass } from "../components/FilterPanel";
import { Icon } from "../components/Icon";
import { ActionButton } from "../components/ActionButton";
import { LeaveEntry, LeaveTotals } from "../components/LeaveParts";
import { useLeaveRecords } from "../hooks/useLeaveRecords";
import { cancelLeaveRecord, createLeaveRecord } from "../services/leave";
import { leaveTypes, leaveUsesHours, type LeaveType } from "../../backend/contracts/leave";

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const inputClass =
  "mt-1 min-h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-ink outline-none transition placeholder:text-ink-muted hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10";

export function LeavePage({ employeeId }: { employeeId: number }) {
  const { requests, loading, error, refresh } = useLeaveRecords(employeeId);
  const [formOpen, setFormOpen] = useState(false);
  const [type, setType] = useState<LeaveType>("Ferie");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [hours, setHours] = useState("2");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);

  const [typeFilter, setTypeFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [month, setMonth] = useState(() => today().slice(0, 7));

  const usesHours = leaveUsesHours(type);

  const filtered = useMemo(
    () =>
      requests.filter(
        (item) =>
          (!typeFilter || item.type === typeFilter) &&
          (!from || item.endDate >= from) &&
          (!to || item.startDate <= to),
      ),
    [requests, typeFilter, from, to],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setFormError("");
    try {
      await createLeaveRecord({
        employeeId,
        type,
        startDate,
        endDate: usesHours ? startDate : endDate,
        hours: usesHours ? Number(hours) : null,
        notes,
      });
      setMessage(`${type} registrata.`);
      setNotes("");
      refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Impossibile salvare.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: number) {
    if (!window.confirm("Vuoi eliminare questa registrazione?")) return;
    setRemovingId(id);
    try {
      await cancelLeaveRecord(id, employeeId);
      refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Impossibile eliminare.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-3.5">
      <header>
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Ferie e straordinari</h1>
        <p className="text-sm text-ink-secondary">Registra ferie, permessi, straordinari e malattia.</p>
      </header>

      <LeaveTotals requests={requests} month={month} onMonthChange={setMonth} />

      <FilterPanel
        active={Boolean(typeFilter || from || to)}
        onReset={() => {
          setTypeFilter("");
          setFrom("");
          setTo("");
        }}
      >
        <FilterField label="Tipo">
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={filterFieldClass}>
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

      <section className="rounded-xl border border-border bg-surface shadow-card">
        <button
          type="button"
          onClick={() => setFormOpen((open) => !open)}
          aria-expanded={formOpen}
          className="flex min-h-12 w-full items-center justify-between gap-3 px-3.5 text-left sm:px-4"
        >
          <span className="flex items-center gap-2.5 text-sm font-extrabold text-ink">
            <span className="grid size-8 place-items-center rounded-lg bg-primary-tint text-primary">
              <Icon name="plus" className="size-4" />
            </span>
            Nuova registrazione
          </span>
          <Icon name="chevron" className={`size-4 text-ink-muted transition ${formOpen ? "rotate-180" : ""}`} />
        </button>
        {formOpen && (
          <form className="space-y-3 border-t border-border p-3.5 sm:p-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs font-semibold text-ink-secondary">
                Tipo
                <select value={type} onChange={(event) => setType(event.target.value as LeaveType)} className={inputClass}>
                  {leaveTypes.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-ink-secondary">
                {usesHours ? "Data" : "Dal"}
                <input
                  required
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    if (endDate < event.target.value) setEndDate(event.target.value);
                  }}
                  className={inputClass}
                />
              </label>
              {usesHours ? (
                <label className="block text-xs font-semibold text-ink-secondary">
                  Ore
                  <input required type="number" min="0.5" max="24" step="0.5" value={hours} onChange={(event) => setHours(event.target.value)} className={inputClass} />
                </label>
              ) : (
                <label className="block text-xs font-semibold text-ink-secondary">
                  Al
                  <input required type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} className={inputClass} />
                </label>
              )}
            </div>
            <label className="block text-xs font-semibold text-ink-secondary">
              Note <span className="font-normal text-ink-muted">· facoltative</span>
              <textarea maxLength={1000} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputClass} resize-y py-2`} />
            </label>
            {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{formError}</p>}
            {message && <p className="rounded-lg bg-primary-tint px-3 py-2 text-sm font-semibold text-primary-dark" role="status">{message}</p>}
            <button
              type="submit"
              disabled={saving}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              {saving ? "Salvataggio..." : "Salva"}
            </button>
          </form>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
        <header className="flex items-baseline justify-between border-b border-border px-3.5 py-2.5 sm:px-4">
          <h2 className="text-sm font-extrabold text-ink">Le tue registrazioni</h2>
          <p className="text-xs text-ink-secondary">{filtered.length} di {requests.length}</p>
        </header>
        {error ? (
          <p className="p-5 text-center text-sm font-semibold text-red-700" role="alert">{error}</p>
        ) : loading ? (
          <p className="p-5 text-center text-sm text-ink-secondary">Caricamento...</p>
        ) : filtered.length === 0 ? (
          <p className="p-5 text-center text-sm text-ink-secondary">Nessuna registrazione.</p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((request) => (
              <LeaveEntry
                key={request.id}
                request={request}
                actions={
                  <ActionButton
                    variant="delete"
                    onClick={() => void handleRemove(request.id)}
                    disabled={removingId === request.id}
                  >
                    Elimina
                  </ActionButton>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
