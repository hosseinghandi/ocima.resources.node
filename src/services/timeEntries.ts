import type { CreateTimeEntryInput, TimeEntry } from "../../shared/timeEntry";

async function readError(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body === "object" && body !== null && "error" in body) {
    const message = body.error;
    if (typeof message === "string") return message;
  }
  return `Richiesta non riuscita (${response.status}).`;
}

export async function getTimeEntries(
  month: string,
  signal?: AbortSignal,
): Promise<TimeEntry[]> {
  const response = await fetch(`/api/time-entries?month=${encodeURIComponent(month)}`, {
    signal,
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as TimeEntry[];
}

export async function createTimeEntry(
  input: CreateTimeEntryInput,
): Promise<TimeEntry> {
  const response = await fetch("/api/time-entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as TimeEntry;
}
