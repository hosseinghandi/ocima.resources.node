import type { ReactNode } from "react";
import type { LeaveRecord, LeaveType } from "../../backend/contracts/leave";
import { Icon } from "./Icon";
import { leaveSummary, monthLeaveHours } from "../utils/leave";
import { formatDateTime } from "../utils/format";

const tiles: { type: LeaveType; label: string; suffix: string; icon: "calendar" | "clock" | "briefcase" | "user" }[] = [
  { type: "Ferie", label: "Ferie", suffix: "ore nel mese", icon: "calendar" },
  { type: "Permesso", label: "Permessi", suffix: "ore nel mese", icon: "clock" },
  { type: "Straordinario", label: "Ore in più", suffix: "ore di straordinario", icon: "briefcase" },
  { type: "Malattia", label: "Malattia", suffix: "ore nel mese", icon: "user" },
];

/** Monthly hours for ferie, permessi, straordinari and malattia, in the app's summary-card style. */
export function LeaveTotals({
  requests,
  month,
  onMonthChange,
}: {
  requests: LeaveRecord[];
  month: string;
  onMonthChange: (month: string) => void;
}) {
  const totals = monthLeaveHours(requests, month);
  return (
    <section className="space-y-2.5" aria-label="Riepilogo ore del mese">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold text-ink">Riepilogo del mese</h2>
        <input
          type="month"
          value={month}
          onChange={(event) => event.target.value && onMonthChange(event.target.value)}
          aria-label="Mese del riepilogo"
          className="min-h-9 rounded-lg border border-border-strong bg-white px-3 text-sm font-medium text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile, index) => (
          <article
            key={tile.type}
            className={`rounded-xl border p-4 ${
              index === 0
                ? "border-primary bg-primary text-white shadow-md shadow-primary/10"
                : "border-border bg-surface text-ink shadow-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm font-semibold ${index === 0 ? "text-white/80" : "text-ink-secondary"}`}>{tile.label}</span>
              <Icon name={tile.icon} className={`size-5 ${index === 0 ? "text-white/80" : "text-primary"}`} />
            </div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight">
              {totals[tile.type].toLocaleString("it-IT", { maximumFractionDigits: 1 })}
            </div>
            <div className={`mt-1 text-xs ${index === 0 ? "text-white/75" : "text-ink-muted"}`}>{tile.suffix}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
export function LeaveEntry({
  request,
  employeeName,
  actions,
}: {
  request: LeaveRecord;
  employeeName?: string;
  actions?: ReactNode;
}) {
  return (
    <article className="px-3.5 py-2.5 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="rounded-full bg-primary-tint px-2.5 py-0.5 text-[11px] font-bold text-primary-dark">
            {request.type}
          </span>
          {employeeName && <span className="truncate text-sm font-extrabold text-ink">{employeeName}</span>}
          <span className="text-sm text-ink-secondary">{leaveSummary(request)}</span>
        </div>
        {actions}
      </div>
      {request.notes && (
        <p className="mt-1 break-words text-xs text-ink-secondary">
          <span className="font-bold text-ink-muted">Note:</span> {request.notes}
        </p>
      )}
      <p className="mt-1 text-[11px] text-ink-muted">Inserita il {formatDateTime(request.createdAt)}</p>
    </article>
  );
}
