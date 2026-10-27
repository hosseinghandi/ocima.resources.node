import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import { validateNewPassword } from "../contracts/password.js";
import type {
  Administrator,
  LoginRole,
  Session,
} from "../contracts/people.js";
import { defaultPassword } from "../lib/config.js";
import { RequestError } from "../lib/errors.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { parseBody, parseId, type Row } from "../lib/validate.js";

const invalidRequest = "Richiesta non valida.";

export function mapResetState(row: Row) {
  return {
    resetRequested: Number(row.reset_requested) === 1,
    resetRequestedAt:
      row.reset_requested_at == null ? null : String(row.reset_requested_at),
    passwordResetAt:
      row.password_reset_at == null ? null : String(row.password_reset_at),
  };
}

function parseRole(value: unknown): LoginRole {
  if (value !== "admin" && value !== "employee") {
    throw new RequestError(invalidRequest, 400);
  }
  return value;
}

export function createAuthRouter(
  employees: DatabaseSync,
  administrators: DatabaseSync,
): Router {
  const router = Router();

  const tableFor = (role: LoginRole) =>
    role === "admin" ? "administrators" : "employees";
  const databaseFor = (role: LoginRole) =>
    role === "admin" ? administrators : employees;

  function findAccount(role: LoginRole, id: number): Row | undefined {
    return databaseFor(role)
      .prepare(
        `SELECT id, name, password_hash${role === "employee" ? ", status" : ""}
         FROM ${tableFor(role)} WHERE id = ?`,
      )
      .get(id);
  }

  router.get("/administrators", (_request, response) => {
    const rows = administrators
      .prepare(
        `SELECT id, name, reset_requested, reset_requested_at, password_reset_at
         FROM administrators ORDER BY name COLLATE NOCASE`,
      )
      .all();
    const result: Administrator[] = rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      ...mapResetState(row),
    }));
    response.json(result);
  });

  router.post("/login", (request, response) => {
    const body = parseBody(request.body);
    const role = parseRole(body.role);
    const id = parseId(body.id, invalidRequest);
    const password = body.password;
    if (typeof password !== "string") {
      throw new RequestError("Richiesta di accesso non valida.", 400);
    }
    const row = findAccount(role, id);
    if (!row || !verifyPassword(password, String(row.password_hash))) {
      throw new RequestError("Password non corretta.", 401);
    }
    if (role === "employee" && row.status === "Inattivo") {
      throw new RequestError("Questo dipendente non è attivo.", 403);
    }
    const session: Session = {
      role,
      id: Number(row.id),
      name: String(row.name),
      mustChangePassword: password === defaultPassword(),
    };
    response.json(session);
  });

  router.post("/change-password", (request, response) => {
    const body = parseBody(request.body);
    const role = parseRole(body.role);
    const id = parseId(body.id, invalidRequest);
    if (
      typeof body.currentPassword !== "string" ||
      typeof body.newPassword !== "string"
    ) {
      throw new RequestError(invalidRequest, 400);
    }
    const row = findAccount(role, id);
    if (!row || !verifyPassword(body.currentPassword, String(row.password_hash))) {
      throw new RequestError("La password attuale non è corretta.", 401);
    }
    const problem = validateNewPassword(body.newPassword);
    if (problem) throw new RequestError(problem, 400);
    if (body.newPassword === defaultPassword()) {
      throw new RequestError("Scegli una password diversa da quella iniziale.", 400);
    }
    databaseFor(role)
      .prepare(
        `UPDATE ${tableFor(role)} SET password_hash = ?, reset_requested = 0,
         reset_requested_at = NULL, password_reset_at = NULL WHERE id = ?`,
      )
      .run(hashPassword(body.newPassword), id);
    response.status(204).end();
  });

  // Lets someone who forgot the password ask an administrator for a reset.
  router.post("/forgot-password", (request, response) => {
    const body = parseBody(request.body);
    const role = parseRole(body.role);
    const id = parseId(body.id, invalidRequest);
    databaseFor(role)
      .prepare(
        `UPDATE ${tableFor(role)} SET reset_requested = 1,
         reset_requested_at = COALESCE(reset_requested_at, CURRENT_TIMESTAMP)
         WHERE id = ?`,
      )
      .run(id);
    response.status(204).end();
  });

  // An administrator confirms with their own password to restore the initial one.
  router.post("/reset-password", (request, response) => {
    const body = parseBody(request.body);
    const role = parseRole(body.role);
    const id = parseId(body.id, invalidRequest);
    const adminId = parseId(body.adminId, invalidRequest);
    if (typeof body.adminPassword !== "string") {
      throw new RequestError(invalidRequest, 400);
    }
    const admin = findAccount("admin", adminId);
    if (!admin || !verifyPassword(body.adminPassword, String(admin.password_hash))) {
      throw new RequestError("La tua password non è corretta.", 401);
    }
    if (!findAccount(role, id)) {
      throw new RequestError("Account non trovato.", 404);
    }
    databaseFor(role)
      .prepare(
        `UPDATE ${tableFor(role)} SET password_hash = ?, reset_requested = 0,
         reset_requested_at = NULL, password_reset_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .run(hashPassword(defaultPassword()), id);
    response.status(204).end();
  });

  return router;
}
