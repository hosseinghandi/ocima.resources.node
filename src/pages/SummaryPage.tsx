import type { TimeEntry } from "../../shared/timeEntry";
import { SummaryCards } from "../components/SummaryCards";
import { TimeEntryList } from "../components/TimeEntryList";
import { Icon } from "../components/Icon";

export function SummaryPage({
  entries,
  loading,
  month,
  onMonthChange,
}: {
  entries: TimeEntry[];
  loading: boolean;
  month: string;
  onMonthChange: (month: string) => void;
}) {
  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Attività registrate</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Riepilogo mensile
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Consulta le ore inserite e le commesse del periodo selezionato.
          </p>
        </div>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-ink-secondary">
          <Icon name="calendar" className="size-4 text-primary" />
          <span className="sr-only">Seleziona mese</span>
          <input
            aria-label="Seleziona mese"
            className="bg-transparent text-ink outline-none"
            type="month"
            value={month}
            onChange={(event) => onMonthChange(event.target.value)}
          />
        </label>
      </header>
      <SummaryCards entries={entries} />
      <TimeEntryList entries={entries} loading={loading} />
    </div>
  );
}
