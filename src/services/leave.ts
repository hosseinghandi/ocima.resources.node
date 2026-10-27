import type { LeaveRecord, LeaveInput } from "../../backend/contracts/leave";
import { jsonInit, send } from "./people";

export const getLeaveRecords = (employeeId?: number, signal?: AbortSignal) =>
  send<LeaveRecord[]>(
    employeeId === undefined
      ? "/api/leave"
      : `/api/leave?employeeId=${employeeId}`,
    { signal },
  );

export const createLeaveRecord = (input: LeaveInput) =>
  send<LeaveRecord>("/api/leave", jsonInit("POST", input));

export const cancelLeaveRecord = (id: number, employeeId: number) =>
  send<void>(`/api/leave/${id}?employeeId=${employeeId}`, {
    method: "DELETE",
  });
