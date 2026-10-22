import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import type {
  CreateTimeEntryInput,
  TimeEntry,
} from "../../shared/timeEntry.js";
import { activitiesForDepartment } from "../activities.js";
import { RequestError } from "../errors.js";

function validMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function parseEntry(body: unknown): CreateTimeEntryInput {
  if (typeof body !== "object" || body === null) {
    throw new RequestError("Il corpo della richiesta non è valido.", 400);
  }
  const input = body as Record<string, unknown>;
  const project = typeof input.project === "string" ? input.project.trim() : "";
  const activity =
    typeof input.activity === "string" ? input.activity.trim() : "";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";

  if (!validDate(input.date)) {
    throw new RequestError("Inserisci una data valida.", 400);
  }
  const employeeId = Number(input.employeeId);
  if (!Number.isSafeInteger(employeeId) || employeeId < 1) {
    throw new RequestError("Dipendente non valido.", 400);
  }
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
  if (
    typeof input.hours !== "number" ||
    !Number.isFinite(input.hours) ||
    input.hours < 0.5 ||
    input.hours > 24 ||
    !Number.isInteger(input.hours * 2)
  ) {
    throw new RequestError(
      "Le ore devono essere comprese tra 0,5 e 24, a intervalli di mezz'ora.",
      400,
    );
  }
  if (notes.length > 1000) {
    throw new RequestError("Le note non possono superare 1000 caratteri.", 400);
  }
  return {
    employeeId,
    date: input.date,
    project,
    activity,
    hours: input.hours,
    notes,
  };
}

function mapEntry(row: Record<string, unknown>): TimeEntry {
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

const entryColumns =
  "id, employee_id, work_date, project, activity, hours, notes, created_at";

export function createTimeEntriesRouter(
  database: DatabaseSync,
  commesseDatabase: DatabaseSync,
  employeesDatabase: DatabaseSync,
): Router {
  const router = Router();

  router.get("/", (request, response, next) => {
    try {
      const month = request.query.month;
      if (month !== undefined && !validMonth(month)) {
        throw new RequestError(
          "Seleziona un mese valido nel formato AAAA-MM.",
          400,
        );
      }
      const employeeParam = request.query.employeeId;
      let employeeId: number | undefined;
      if (employeeParam !== undefined) {
        employeeId = Number(employeeParam);
        if (!Number.isSafeInteger(employeeId) || employeeId < 0) {
          throw new RequestError("Dipendente non valido.", 400);
        }
      }
      const conditions: string[] = [];
      const params: (string | number)[] = [];
      if (month !== undefined) {
        conditions.push("work_date LIKE ?");
        params.push(`${month}-%`);
      }
      if (employeeId !== undefined) {
        conditions.push("employee_id = ?");
        params.push(employeeId);
      }
      const rows = database
        .prepare(
          `SELECT ${entryColumns}
           FROM time_entries
           ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
           ORDER BY work_date DESC, id DESC`,
        )
        .all(...params);
      response.json(
        rows.map((row) => mapEntry(row as Record<string, unknown>)),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/", (request, response, next) => {
    try {
      const input = parseEntry(request.body);
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
        .get(input.employeeId) as
        | { status: string; department: string }
        | undefined;
      if (!employee) {
        throw new RequestError("Dipendente non trovato.", 404);
      }
      if (
        !activitiesForDepartment(employee.department)?.includes(input.activity)
      ) {
        throw new RequestError(
          "Seleziona un'attività prevista per il reparto del dipendente.",
          400,
        );
      }
      if (employee.status === "Inattivo") {
        throw new RequestError("Questo dipendente non è attivo.", 403);
      }
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
      const row = database
        .prepare(`SELECT ${entryColumns} FROM time_entries WHERE id = ?`)
        .get(Number(result.lastInsertRowid));
      if (!row) throw new Error("La registrazione non è stata salvata.");
      response.status(201).json(mapEntry(row as Record<string, unknown>));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
