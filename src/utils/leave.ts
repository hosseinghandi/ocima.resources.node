import type { LeaveRecord, LeaveType } from "../../backend/contracts/leave";
import { formatDate, formatHours } from "./format";

const WORKDAY_HOURS = 8;

export function leaveDays(start: string, end: string): number {
  const from = new Date(`${start}T00:00:00Z`).valueOf();
  const to = new Date(`${end}T00:00:00Z`).valueOf();
  return Math.round((to - from) / 86_400_000) + 1;
}

export function leaveSummary(request: LeaveRecord): string {
  if (request.hours !== null) {
    return `${formatDate(request.startDate)} · ${formatHours(request.hours)}`;
  }
  const days = leaveDays(request.startDate, request.endDate);
  const range =
    request.startDate === request.endDate
      ? formatDate(request.startDate)
      : `${formatDate(request.startDate)} → ${formatDate(request.endDate)}`;
  return `${range} · ${days} ${days === 1 ? "giorno" : "giorni"}`;
}

function weekdaysBetween(start: string, end: string): number {
  let count = 0;
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/** Hours per leave type falling in a "YYYY-MM" month; ferie and malattia count 8h per working day. */
export function monthLeaveHours(
  requests: LeaveRecord[],
  month: string,
): Record<LeaveType, number> {
  const first = `${month}-01`;
  const last = `${month}-${lastDay(month)}`;
  const totals: Record<LeaveType, number> = {
    Ferie: 0,
    Permesso: 0,
    Straordinario: 0,
    Malattia: 0,
  };
  for (const item of requests) {
    if (item.hours !== null) {
      if (item.startDate >= first && item.startDate <= last) {
        totals[item.type] += item.hours;
      }
      continue;
    }
    const start = item.startDate > first ? item.startDate : first;
    const end = item.endDate < last ? item.endDate : last;
    if (start <= end) {
      totals[item.type] +=
        weekdaysBetween(start, end <= `${month}-28` ? end : clampDay(end, month)) *
        WORKDAY_HOURS;
    }
  }
  return totals;
}

function clampDay(date: string, month: string): string {
  return date.startsWith(month) ? date : `${month}-${lastDay(month)}`;
}

function lastDay(month: string): string {
  const [year, number] = month.split("-").map(Number);
  return String(new Date(Date.UTC(year, number, 0)).getUTCDate()).padStart(2, "0");
}
