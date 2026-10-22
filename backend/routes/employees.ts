import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import {
  employeeStatuses,
  type Employee,
  type EmployeeInput,
  type EmployeeStatus,
} from "../../shared/people.js";
import { activitiesForDepartment } from "../activities.js";
import { RequestError } from "../errors.js";
import { hashPassword } from "../password.js";
import { DEFAULT_PASSWORD } from "../seeds/people.js";

const columns =
  "id, name, department, email, phone, status, reset_requested, reset_requested_at, password_reset_at";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseEmployee(body: unknown): EmployeeInput {
  if (typeof body !== "object" || body === null) {
    throw new RequestError("Il corpo della richiesta non è valido.", 400);
  }
  const input = body as Record<string, unknown>;
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

function mapEmployee(row: Record<string, unknown>): Employee {
  return {
    id: Number(row.id),
    name: String(row.name),
    department: String(row.department),
    email: String(row.email),
    phone: String(row.phone),
    status: String(row.status) as EmployeeStatus,
    resetRequested: Number(row.reset_requested) === 1,
    resetRequestedAt:
      row.reset_requested_at == null ? null : String(row.reset_requested_at),
    passwordResetAt:
      row.password_reset_at == null ? null : String(row.password_reset_at),
  };
}

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new RequestError("Identificativo dipendente non valido.", 400);
  }
  return id;
}

export function createEmployeesRouter(
  database: DatabaseSync,
  timeEntries: DatabaseSync,
): Router {
  const router = Router();

  function find(id: number): Employee | undefined {
    const row = database
      .prepare(`SELECT ${columns} FROM employees WHERE id = ?`)
      .get(id);
    return row ? mapEmployee(row as Record<string, unknown>) : undefined;
  }

  router.get("/", (_request, response, next) => {
    try {
      const rows = database
        .prepare(
          `SELECT ${columns} FROM employees
           ORDER BY name COLLATE NOCASE, id`,
        )
        .all();
      response.json(
        rows.map((row) => mapEmployee(row as Record<string, unknown>)),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/", (request, response, next) => {
    try {
      const input = parseEmployee(request.body);
      const duplicate = database
        .prepare("SELECT id FROM employees WHERE name = ?")
        .get(input.name);
      if (duplicate) {
        throw new RequestError("Esiste già un dipendente con questo nome.", 409);
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
          hashPassword(DEFAULT_PASSWORD),
        );
      const created = find(Number(result.lastInsertRowid));
      if (!created) throw new Error("Il dipendente non è stato salvato.");
      response.status(201).json(created);
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", (request, response, next) => {
    try {
      const id = parseId(request.params.id);
      const input = parseEmployee(request.body);
      if (!find(id)) throw new RequestError("Dipendente non trovato.", 404);
      const duplicate = database
        .prepare("SELECT id FROM employees WHERE name = ? AND id != ?")
        .get(input.name, id);
      if (duplicate) {
        throw new RequestError("Esiste già un dipendente con questo nome.", 409);
      }
      database
        .prepare(
          `UPDATE employees SET name = ?, department = ?, email = ?,
           phone = ?, status = ? WHERE id = ?`,
        )
        .run(
          input.name,
          input.department,
          input.email,
          input.phone,
          input.status,
          id,
        );
      const updated = find(id);
      if (!updated) throw new Error("Il dipendente aggiornato non è stato trovato.");
      response.json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", (request, response, next) => {
    try {
      const id = parseId(request.params.id);
      if (!find(id)) throw new RequestError("Dipendente non trovato.", 404);
      const entries = timeEntries
        .prepare("SELECT COUNT(*) AS total FROM time_entries WHERE employee_id = ?")
        .get(id) as { total: number } | undefined;
      if (entries && Number(entries.total) > 0) {
        throw new RequestError(
          "Il dipendente ha ore registrate: impostalo come Inattivo invece di eliminarlo.",
          409,
        );
      }
      database.prepare("DELETE FROM employees WHERE id = ?").run(id);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
