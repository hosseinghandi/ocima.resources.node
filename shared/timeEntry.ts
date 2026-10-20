export interface TimeEntry {
  id: number;
  date: string;
  project: string;
  activity: string;
  hours: number;
  notes: string;
  createdAt: string;
}

export type CreateTimeEntryInput = Omit<TimeEntry, "id" | "createdAt">;
