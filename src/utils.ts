export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const blob = new Blob([`\uFEFF${rows.map((row) => row.map(escape).join(";")).join("\r\n")}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function formatDateTime(value: string): string {
  const parsed = new Date(`${value.replace(" ", "T")}Z`);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function formatHours(value: number): string {
  return `${value.toLocaleString("it-IT", { maximumFractionDigits: 1 })} h`;
}
