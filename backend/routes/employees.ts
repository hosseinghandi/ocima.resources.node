import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import {
  employeeStatuses,
  type Employee,
  type EmployeeInput,
  type EmployeeStatus,
} from "../contracts/people.js";
import { RequestError } from "../lib/errors.js";
import { hashPassword } from "../lib/password.js";
import { parseBody, parseId, text, type Row } from "../lib/validate.js";
import { defaultPassword } from "../lib/config.js";
import { activitiesForDepartment } from "./activities.js";
import { mapResetState } from "./auth.js";

const columns =
  "id, name, department, email, phone, status, reset_requested, reset_requested_at, password_reset_at";

function parseEmployee(body: unknown): EmployeeInput {
  const input = parseBody(body);
  const name = text(input.name);
  const department = text(input.department);
  const email = text(input.email);
  const phone = text(input.phone);
  const status = text(input.status) || "Attivo";

  if (!name || name.length > 100) {
    throw new RequestError(
      "Il nome è obbligatorio e deve contenere al massimo 100 caratteri.",
      400,
    );
  }
  if (!activitiesForDepartment(department)) {
    throw new RequestError("Seleziona un reparto valido.", 400);
  }
  if (email.length > 160 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw new RequestError("Inserisci un indirizzo email valido.", 400);
  }
  if (phone.length > 40) {
    throw new RequestError("Il telefono non può superare 40 caratteri.", 400);
  }
  if (!(employeeStatuses as readonly string[]).includes(status)) {
    throw new RequestError("Stato dipendente non valido.", 400);
  }
  return { name, department, email, phone, status: status as EmployeeStatus };
}

function mapEmployee(row: Row): Employee {
  return {
    id: Number(row.id),
    name: String(row.name),
    department: String(row.department),
    email: String(row.email),
    phone: String(row.phone),
    status: String(row.status) as EmployeeStatus,
    ...mapResetState(row),
  };
}

export function createEmployeesRouter(
  database: DatabaseSync,
  timeEntries: DatabaseSync,
): Router {
  const router = Router();
  const idError = "Identificativo dipendente non valido.";
  const duplicateError = "Esiste già un dipendente con questo nome.";

  const find = (id: number): Employee | undefined => {
    const row = database
      .prepare(`SELECT ${columns} FROM employees WHERE id = ?`)
      .get(id);
    return row ? mapEmployee(row) : undefined;
  };

  router.get("/", (_request, response) => {
    const rows = database
      .prepare(`SELECT ${columns} FROM employees ORDER BY name COLLATE NOCASE, id`)
      .all();
    response.json(rows.map(mapEmployee));
  });

  router.post("/", (request, response) => {
    const input = parseEmployee(request.body);
    if (database.prepare("SELECT 1 FROM employees WHERE name = ?").get(input.name)) {
      throw new RequestError(duplicateError, 409);
    }
    const result = database
      .prepare(
        `INSERT INTO employees
          (name, department, email, phone, status, password_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.name,
        input.department,
        input.email,
        input.phone,
        input.status,
        hashPassword(defaultPassword()),
      );
    response.status(201).json(find(Number(result.lastInsertRowid)));
  });

  router.put("/:id", (request, response) => {
    const id = parseId(request.params.id, idError);
    const input = parseEmployee(request.body);
    if (!find(id)) throw new RequestError("Dipendente non trovato.", 404);
    if (
      database
        .prepare("SELECT 1 FROM employees WHERE name = ? AND id != ?")
        .get(input.name, id)
    ) {
      throw new RequestError(duplicateError, 409);
    }
    database
      .prepare(
        `UPDATE employees SET name = ?, department = ?, email = ?,
         phone = ?, status = ? WHERE id = ?`,
      )
      .run(input.name, input.department, input.email, input.phone, input.status, id);
    response.json(find(id));
  });

  router.delete("/:id", (request, response) => {
    const id = parseId(request.params.id, idError);
    if (!find(id)) throw new RequestError("Dipendente non trovato.", 404);
    if (
      timeEntries
        .prepare("SELECT 1 FROM time_entries WHERE employee_id = ? LIMIT 1")
        .get(id)
    ) {
      throw new RequestError(
        "Il dipendente ha ore registrate: impostalo come Inattivo invece di eliminarlo.",
        409,
      );
    }
    database.prepare("DELETE FROM employees WHERE id = ?").run(id);
    response.status(204).end();
  });

  return router;
}
