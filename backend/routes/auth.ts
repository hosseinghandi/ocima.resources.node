import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import { DEFAULT_PASSWORD, validateNewPassword } from "../../shared/password.js";
import type { Administrator, LoginRole, Session } from "../../shared/people.js";
import { RequestError } from "../errors.js";
import { hashPassword, verifyPassword } from "../password.js";

export function createAuthRouter(
  employees: DatabaseSync,
  administrators: DatabaseSync,
): Router {
  const router = Router();

  const tableFor = (role: LoginRole) =>
    role === "admin" ? "administrators" : "employees";
  const databaseFor = (role: LoginRole) =>
    role === "admin" ? administrators : employees;

  function parseRole(value: unknown): LoginRole {
    if (value !== "admin" && value !== "employee") {
      throw new RequestError("Richiesta non valida.", 400);
    }
    return value;
  }

  function parseId(value: unknown): number {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new RequestError("Richiesta non valida.", 400);
    }
    return id;
  }

  function findAccount(role: LoginRole, id: number) {
    return databaseFor(role)
      .prepare(
        `SELECT id, name, password_hash${role === "employee" ? ", status" : ""}
         FROM ${tableFor(role)} WHERE id = ?`,
      )
      .get(id) as Record<string, unknown> | undefined;
  }

  router.get("/administrators", (_request, response, next) => {
    try {
      const rows = administrators
        .prepare(
          "SELECT id, name, reset_requested, reset_requested_at, password_reset_at FROM administrators ORDER BY name COLLATE NOCASE",
        )
        .all() as Record<string, unknown>[];
      const result: Administrator[] = rows.map((row) => ({
        id: Number(row.id),
        name: String(row.name),
        resetRequested: Number(row.reset_requested) === 1,
        resetRequestedAt:
          row.reset_requested_at == null ? null : String(row.reset_requested_at),
        passwordResetAt:
          row.password_reset_at == null ? null : String(row.password_reset_at),
      }));
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", (request, response, next) => {
    try {
      const body = request.body as Record<string, unknown> | null;
      const role = parseRole(body?.role);
      const id = parseId(body?.id);
      const password = body?.password;
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
      };
      response.json(session);
    } catch (error) {
      next(error);
    }
  });

  router.post("/change-password", (request, response, next) => {
    try {
      const body = request.body as Record<string, unknown> | null;
      const role = parseRole(body?.role);
      const id = parseId(body?.id);
      if (
        typeof body?.currentPassword !== "string" ||
        typeof body?.newPassword !== "string"
      ) {
        throw new RequestError("Richiesta non valida.", 400);
      }
      const row = findAccount(role, id);
      if (!row || !verifyPassword(body.currentPassword, String(row.password_hash))) {
        throw new RequestError("La password attuale non è corretta.", 401);
      }
      const problem = validateNewPassword(body.newPassword);
      if (problem) throw new RequestError(problem, 400);
      databaseFor(role)
        .prepare(
          `UPDATE ${tableFor(role)} SET password_hash = ?, reset_requested = 0,
           reset_requested_at = NULL, password_reset_at = NULL WHERE id = ?`,
        )
        .run(hashPassword(body.newPassword), id);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // Lets someone who forgot the password ask an administrator for a reset.
  router.post("/forgot-password", (request, response, next) => {
    try {
      const body = request.body as Record<string, unknown> | null;
      const role = parseRole(body?.role);
      const id = parseId(body?.id);
      databaseFor(role)
        .prepare(
          `UPDATE ${tableFor(role)} SET reset_requested = 1,
           reset_requested_at = COALESCE(reset_requested_at, CURRENT_TIMESTAMP)
           WHERE id = ?`,
        )
        .run(id);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // An administrator confirms with their own password to restore the initial one.
  router.post("/reset-password", (request, response, next) => {
    try {
      const body = request.body as Record<string, unknown> | null;
      const role = parseRole(body?.role);
      const id = parseId(body?.id);
      const adminId = parseId(body?.adminId);
      if (typeof body?.adminPassword !== "string") {
        throw new RequestError("Richiesta non valida.", 400);
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
        .run(hashPassword(DEFAULT_PASSWORD), id);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
