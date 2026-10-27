import type { ReactNode } from "react";

export const filterFieldClass =
  "mt-1 min-h-10 w-full rounded-lg border border-border-strong bg-white px-3 text-sm font-medium text-ink outline-none transition placeholder:text-ink-muted focus:border-primary focus:ring-4 focus:ring-primary/10";

/** Shared filter card: labelled fields in a responsive grid plus a reset button. */
export function FilterPanel({
  children,
  active,
  onReset,
  resetClassName = "",
}: {
  children: ReactNode;
  active: boolean;
  onReset: () => void;
  resetClassName?: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-white p-3 shadow-card sm:p-4" aria-label="Filtri">
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {children}
        <div className={`flex items-end ${resetClassName}`}>
          <button
            type="button"
            onClick={onReset}
            disabled={!active}
            className="min-h-10 w-full rounded-lg border border-border px-3 text-sm font-bold text-ink-secondary transition hover:bg-surface-muted disabled:opacity-50"
          >
            Reimposta filtri
          </button>
        </div>
      </div>
    </section>
  );
}

export function FilterField({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block text-xs font-semibold text-ink-secondary ${className}`}>
      {label}
      {children}
    </label>
  );
}
