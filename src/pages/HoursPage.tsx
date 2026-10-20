import { HoursEntryForm } from "../components/HoursEntryForm";
import { SummaryCards } from "../components/SummaryCards";
import { TimeEntryList } from "../components/TimeEntryList";
import type { TimeEntry } from "../../shared/timeEntry";

export function HoursPage({
  entries,
  loading,
  month,
  onEntrySaved,
}: {
  entries: TimeEntry[];
  loading: boolean;
  month: string;
  onEntrySaved: (entry: TimeEntry) => void;
}) {
  const monthLabel = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Area personale</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Le tue ore
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Registra il lavoro svolto e tieni sotto controllo il mese.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-semibold capitalize text-ink-secondary">
          {monthLabel}
        </div>
      </header>

      <SummaryCards entries={entries} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <HoursEntryForm onSaved={onEntrySaved} />
        <TimeEntryList entries={entries} loading={loading} limit={5} />
      </div>
    </div>
  );
}
