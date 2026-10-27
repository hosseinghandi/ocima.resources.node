import { useState } from "react";
import type { CreateTimeEntryInput, TimeEntry } from "../../backend/contracts/timeEntry";
import { SummaryCards } from "../components/SummaryCards";
import { TimeEntryList } from "../components/TimeEntryList";
import { Icon } from "../components/Icon";

const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("it-IT", { month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(2020, index, 1))),
);

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

function shiftMonth(value: string, amount: number) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function SummaryPage({
  employeeId,
  entries,
  loading,
  onUpdate,
  onDelete,
  month,
  onMonthChange,
}: {
  employeeId: number;
  entries: TimeEntry[];
  loading: boolean;
  onUpdate: (id: number, input: CreateTimeEntryInput) => Promise<TimeEntry>;
  onDelete: (entry: TimeEntry) => Promise<void>;
  month: string;
  onMonthChange: (month: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(Number(month.slice(0, 4)));
  const selectedMonth = Number(month.slice(5, 7)) - 1;
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear + 1 - 2000 + 1 },
    (_, index) => currentYear + 1 - index,
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">Attività registrate</p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            Riepilogo
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Ore lavorate e dettagli per il mese selezionato.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            aria-label="Mese precedente"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-surface text-ink-secondary transition hover:border-primary/40 hover:bg-primary-tint hover:text-primary"
          >
            <Icon name="chevron" className="size-4 rotate-180" />
          </button>
          <div className="relative">
            <button
              type="button"
              aria-expanded={pickerOpen}
              aria-haspopup="dialog"
              onClick={() => {
                setPickerYear(Number(month.slice(0, 4)));
                setPickerOpen((open) => !open);
              }}
              className="flex min-h-11 min-w-44 items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 text-sm font-bold capitalize text-ink shadow-card transition hover:border-primary/40"
            >
              <span className="flex items-center gap-2.5">
                <Icon name="calendar" className="size-4 text-primary" />
                {monthLabel(month)}
              </span>
              <Icon name="chevron" className={`size-3.5 transition ${pickerOpen ? "-rotate-90" : "rotate-90"}`} />
            </button>
            {pickerOpen && (
              <>
                <button
                  type="button"
                  aria-label="Chiudi selezione mese"
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={() => setPickerOpen(false)}
                />
                <section
                  role="dialog"
                  aria-label="Seleziona mese e anno"
                  className="absolute right-0 z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-border bg-white p-4 shadow-xl"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-ink-muted">Periodo del report</p>
                      <h2 className="mt-0.5 text-base font-extrabold capitalize text-ink">{monthLabel(`${pickerYear}-${String(selectedMonth + 1).padStart(2, "0")}`)}</h2>
                    </div>
                    <label className="sr-only" htmlFor="report-year">Anno</label>
                    <select
                      id="report-year"
                      aria-label="Anno"
                      value={pickerYear}
                      onChange={(event) => setPickerYear(Number(event.target.value))}
                      className="min-h-10 rounded-lg border border-border bg-surface-muted px-2.5 text-sm font-bold text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    >
                      {years.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {monthNames.map((name, index) => {
                      const active = index === selectedMonth && pickerYear === Number(month.slice(0, 4));
                      return (
                        <button
                          key={name}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            onMonthChange(`${pickerYear}-${String(index + 1).padStart(2, "0")}`);
                            setPickerOpen(false);
                          }}
                          className={`min-h-10 rounded-lg px-2 text-xs font-bold capitalize transition ${
                            active
                              ? "bg-primary text-white shadow-sm"
                              : "text-ink-secondary hover:bg-primary-tint hover:text-primary-dark"
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-ink-muted">Seleziona un mese</span>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        onMonthChange(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
                        setPickerOpen(false);
                      }}
                      className="rounded-md px-2 py-1 text-xs font-bold text-primary hover:bg-primary-tint"
                    >
                      Questo mese
                    </button>
                  </div>
                </section>
              </>
            )}
          </div>
          <button
            type="button"
            aria-label="Mese successivo"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-surface text-ink-secondary transition hover:border-primary/40 hover:bg-primary-tint hover:text-primary"
          >
            <Icon name="chevron" className="size-4" />
          </button>
        </div>
      </header>
      <SummaryCards entries={entries} />
      <TimeEntryList
        employeeId={employeeId}
        entries={entries}
        loading={loading}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </div>
  );
}
