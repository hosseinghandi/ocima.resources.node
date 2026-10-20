import type { TimeEntry } from "../../shared/timeEntry";
import { Icon } from "./Icon";

export function SummaryCards({ entries }: { entries: TimeEntry[] }) {
  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
  const projects = new Set(entries.map((entry) => entry.project.trim())).size;
  const metrics = [
    {
      label: "Ore registrate",
      value: totalHours.toLocaleString("it-IT", { maximumFractionDigits: 1 }),
      suffix: "ore nel mese",
      icon: "clock" as const,
      primary: true,
    },
    {
      label: "Giornate inserite",
      value: new Set(entries.map((entry) => entry.date)).size.toString(),
      suffix: "date con attività",
      icon: "calendar" as const,
      primary: false,
    },
    {
      label: "Commesse",
      value: projects.toString(),
      suffix: "commesse coinvolte",
      icon: "briefcase" as const,
      primary: false,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className={`rounded-xl border p-5 ${
            metric.primary
              ? "border-primary bg-primary text-white shadow-md shadow-primary/10"
              : "border-border bg-surface text-ink shadow-card"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold ${metric.primary ? "text-white/80" : "text-ink-secondary"}`}>
              {metric.label}
            </span>
            <Icon
              name={metric.icon}
              className={`size-5 ${metric.primary ? "text-white/80" : "text-primary"}`}
            />
          </div>
          <div className="mt-4 text-3xl font-extrabold tracking-tight">
            {metric.value}
          </div>
          <div className={`mt-1 text-xs ${metric.primary ? "text-white/75" : "text-ink-muted"}`}>
            {metric.suffix}
          </div>
        </article>
      ))}
    </div>
  );
}
