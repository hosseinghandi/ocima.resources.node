import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import {
  leaveTypes,
  leaveUsesHours,
  type LeaveRecord,
  type LeaveInput,
  type LeaveType,
} from "../contracts/leave.js";
import { RequestError } from "../lib/errors.js";
import {
  isValidDate,
  parseBody,
  parseHours,
  parseId,
  parseNotes,
  type Row,
} from "../lib/validate.js";

const columns =
  "id, employee_id, type, start_date, end_date, hours, notes, created_at";
const employeeError = "Dipendente non valido.";

function parseInput(body: unknown): LeaveInput {
  const input = parseBody(body);
  const employeeId = parseId(input.employeeId, employeeError);
  if (!leaveTypes.includes(input.type as LeaveType)) {
    throw new RequestError("Seleziona un tipo di richiesta valido.", 400);
  }
  const type = input.type as LeaveType;
  if (!isValidDate(input.startDate) || !isValidDate(input.endDate)) {
    throw new RequestError("Inserisci date valide.", 400);
  }
  const startDate = input.startDate;
  let endDate = input.endDate;
  let hours: number | null = null;
  if (leaveUsesHours(type)) {
    endDate = startDate;
    hours = parseHours(input.hours);
  } else if (endDate < startDate) {
    throw new RequestError(
      "La data finale non può precedere quella iniziale.",
      400,
    );
  }
  return { employeeId, type, startDate, endDate, hours, notes: parseNotes(input.notes) };
}

function mapRequest(row: Row): LeaveRecord {
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    type: String(row.type) as LeaveType,
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    hours: row.hours == null ? null : Number(row.hours),
    notes: String(row.notes),
    createdAt: String(row.created_at),
  };
}

export function createLeaveRouter(
  database: DatabaseSync,
  employeesDatabase: DatabaseSync,
): Router {
  const router = Router();

  router.get("/", (request, response) => {
    const param = request.query.employeeId;
    const filtered = param !== undefined;
    const rows = database
      .prepare(
        `SELECT ${columns} FROM leave_records
         ${filtered ? "WHERE employee_id = ?" : ""}
         ORDER BY start_date DESC, id DESC`,
      )
      .all(...(filtered ? [parseId(param, employeeError)] : []));
    response.json(rows.map(mapRequest));
  });

  router.post("/", (request, response) => {
    const input = parseInput(request.body);
    const employee = employeesDatabase
      .prepare("SELECT status FROM employees WHERE id = ?")
      .get(input.employeeId);
    if (!employee) throw new RequestError("Dipendente non trovato.", 404);
    if (employee.status === "Inattivo") {
      throw new RequestError("Questo dipendente non è attivo.", 403);
    }
    const result = database
      .prepare(
        `INSERT INTO leave_records
           (employee_id, type, start_date, end_date, hours, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.employeeId,
        input.type,
        input.startDate,
        input.endDate,
        input.hours,
        input.notes,
      );
    const row = database
      .prepare(`SELECT ${columns} FROM leave_records WHERE id = ?`)
      .get(Number(result.lastInsertRowid));
    response.status(201).json(mapRequest(row as Row));
  });

  router.delete("/:id", (request, response) => {
    const id = parseId(request.params.id, "Richiesta non valida.");
    const employeeId = parseId(request.query.employeeId, employeeError);
    const row = database
      .prepare("SELECT employee_id FROM leave_records WHERE id = ?")
      .get(id);
    if (!row || Number(row.employee_id) !== employeeId) {
      throw new RequestError("Richiesta non trovata.", 404);
    }
    database.prepare("DELETE FROM leave_records WHERE id = ?").run(id);
    response.status(204).end();
  });

  return router;
}
