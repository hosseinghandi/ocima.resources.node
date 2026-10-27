import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import type {
  CreateTimeEntryInput,
  TimeEntry,
} from "../contracts/timeEntry.js";
import { RequestError } from "../lib/errors.js";
import {
  isValidDate,
  parseBody,
  parseHours,
  parseId,
  parseNotes,
  text,
  type Row,
} from "../lib/validate.js";
import { activitiesForDepartment } from "./activities.js";

const columns =
  "id, employee_id, work_date, project, activity, hours, notes, created_at";
const employeeError = "Dipendente non valido.";
const entryError = "Registrazione non valida.";

function parseEntry(body: unknown): CreateTimeEntryInput {
  const input = parseBody(body);
  const project = text(input.project);
  const activity = text(input.activity);

  if (!isValidDate(input.date)) {
    throw new RequestError("Inserisci una data valida.", 400);
  }
  const employeeId = parseId(input.employeeId, employeeError);
  if (!project || project.length > 240) {
    throw new RequestError(
      "La commessa è obbligatoria e deve contenere al massimo 240 caratteri.",
      400,
    );
  }
  if (!activity || activity.length > 160) {
    throw new RequestError(
      "L'attività è obbligatoria e deve contenere al massimo 160 caratteri.",
      400,
    );
  }
  return {
    employeeId,
    date: input.date,
    project,
    activity,
    hours: parseHours(input.hours),
    notes: parseNotes(input.notes),
  };
}

function mapEntry(row: Row): TimeEntry {
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    date: String(row.work_date),
    project: String(row.project),
    activity: String(row.activity),
    hours: Number(row.hours),
    notes: String(row.notes),
    createdAt: String(row.created_at),
  };
}

export function createTimeEntriesRouter(
  database: DatabaseSync,
  commesseDatabase: DatabaseSync,
  employeesDatabase: DatabaseSync,
): Router {
  const router = Router();

  router.get("/", (request, response) => {
    const { month, employeeId } = request.query;
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    if (month !== undefined) {
      if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        throw new RequestError(
          "Seleziona un mese valido nel formato AAAA-MM.",
          400,
        );
      }
      conditions.push("work_date LIKE ?");
      params.push(`${month}-%`);
    }
    if (employeeId !== undefined) {
      const id = Number(employeeId);
      // 0 selects entries saved before employees were tracked.
      if (!Number.isSafeInteger(id) || id < 0) {
        throw new RequestError(employeeError, 400);
      }
      conditions.push("employee_id = ?");
      params.push(id);
    }
    const rows = database
      .prepare(
        `SELECT ${columns} FROM time_entries
         ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
         ORDER BY work_date DESC, id DESC`,
      )
      .all(...params);
    response.json(rows.map(mapEntry));
  });

  function assertAllowed(input: CreateTimeEntryInput): void {
    const commessa = commesseDatabase
      .prepare(
        `SELECT 1 FROM commesse
         WHERE codice_cliente || commessa = ?
           OR (trim(codice_cliente) = '' AND commessa = ?)`,
      )
      .get(input.project, input.project);
    if (!commessa) {
      throw new RequestError(
        "Seleziona una commessa presente nell'archivio.",
        400,
      );
    }
    const employee = employeesDatabase
      .prepare("SELECT status, department FROM employees WHERE id = ?")
      .get(input.employeeId);
    if (!employee) throw new RequestError("Dipendente non trovato.", 404);
    if (
      !activitiesForDepartment(String(employee.department))?.includes(
        input.activity,
      )
    ) {
      throw new RequestError(
        "Seleziona un'attività prevista per il reparto del dipendente.",
        400,
      );
    }
    if (employee.status === "Inattivo") {
      throw new RequestError("Questo dipendente non è attivo.", 403);
    }
  }

  const find = (id: number): Row | undefined =>
    database.prepare(`SELECT ${columns} FROM time_entries WHERE id = ?`).get(id);

  // An entry can only be changed by the employee who recorded it.
  function findOwned(id: number, employeeId: number): Row {
    const row = find(id);
    if (!row || Number(row.employee_id) !== employeeId) {
      throw new RequestError("Registrazione non trovata.", 404);
    }
    return row;
  }

  router.post("/", (request, response) => {
    const input = parseEntry(request.body);
    assertAllowed(input);
    const result = database
      .prepare(
        `INSERT INTO time_entries
          (employee_id, work_date, project, activity, hours, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.employeeId,
        input.date,
        input.project,
        input.activity,
        input.hours,
        input.notes,
      );
    response.status(201).json(mapEntry(find(Number(result.lastInsertRowid))!));
  });

  router.put("/:id", (request, response) => {
    const id = parseId(request.params.id, entryError);
    const input = parseEntry(request.body);
    findOwned(id, input.employeeId);
    assertAllowed(input);
    database
      .prepare(
        `UPDATE time_entries SET work_date = ?, project = ?, activity = ?,
         hours = ?, notes = ? WHERE id = ?`,
      )
      .run(input.date, input.project, input.activity, input.hours, input.notes, id);
    response.json(mapEntry(find(id)!));
  });

  router.delete("/:id", (request, response) => {
    const id = parseId(request.params.id, entryError);
    findOwned(id, parseId(request.query.employeeId, employeeError));
    database.prepare("DELETE FROM time_entries WHERE id = ?").run(id);
    response.status(204).end();
  });

  return router;
}