import type { TimeEntry } from "../../shared/timeEntry";
import { Icon } from "./Icon";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function TimeEntryList({
  entries,
  loading,
  limit,
}: {
  entries: TimeEntry[];
  loading: boolean;
  limit?: number;
}) {
  const visibleEntries = limit ? entries.slice(0, limit) : entries;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="font-extrabold text-ink">Registrazioni</h2>
          <p className="mt-0.5 text-xs text-ink-secondary">
            {entries.length} {entries.length === 1 ? "voce" : "voci"} nel periodo
          </p>
        </div>
        <span className="grid size-9 place-items-center rounded-lg bg-primary-tint text-primary">
          <Icon name="calendar" className="size-[18px]" />
        </span>
      </div>
      {loading ? (
        <p className="px-5 py-8 text-center text-sm text-ink-secondary">Caricamento registrazioni...</p>
      ) : visibleEntries.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-surface-muted text-ink-muted">
            <Icon name="note" className="size-5" />
          </span>
          <p className="mt-3 text-sm font-bold text-ink">Ancora nessuna registrazione</p>
          <p className="mt-1 text-xs text-ink-secondary">
            Le ore inserite appariranno qui.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {visibleEntries.map((entry) => (
            <article key={entry.id} className="flex items-center gap-3 px-5 py-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
                <Icon name="briefcase" className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{entry.project}</p>
                <p className="truncate text-xs text-ink-secondary">{entry.activity}</p>
                <p className="mt-1 text-[11px] text-ink-muted">{formatDate(entry.date)}</p>
              </div>
              <span className="whitespace-nowrap rounded-md bg-surface-muted px-2 py-1 text-sm font-extrabold text-ink">
                {entry.hours.toLocaleString("it-IT")} h
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
