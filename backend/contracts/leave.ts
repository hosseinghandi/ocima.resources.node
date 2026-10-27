export const leaveTypes = [
  "Ferie",
  "Permesso",
  "Straordinario",
  "Malattia",
] as const;
export type LeaveType = (typeof leaveTypes)[number];

/** Ferie and malattia span a date range of days; permessi and straordinari are one day with hours. */
export function leaveUsesHours(type: LeaveType): boolean {
  return type === "Permesso" || type === "Straordinario";
}

export interface LeaveRecord {
  id: number;
  employeeId: number;
  type: LeaveType;
  startDate: string;
  endDate: string;
  hours: number | null;
  notes: string;
  createdAt: string;
}

export interface LeaveInput {
  employeeId: number;
  type: LeaveType;
  startDate: string;
  endDate: string;
  hours: number | null;
  notes: string;
}
