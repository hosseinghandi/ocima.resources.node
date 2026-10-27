import { Router } from "express";
import type { Databases } from "../db/db.js";
import { createActivitiesRouter } from "./activities.js";
import { createAuthRouter } from "./auth.js";
import { createCommesseRouter } from "./commesse.js";
import { createEmployeesRouter } from "./employees.js";
import { createLeaveRouter } from "./leave.js";
import { createTimeEntriesRouter } from "./timeEntries.js";

export function createApiRouter(databases: Databases): Router {
  const api = Router();
  api.get("/health", (_request, response) => response.json({ status: "ok" }));
  api.use("/commesse", createCommesseRouter(databases.commesse));
  api.use("/activities", createActivitiesRouter());
  api.use(
    "/employees",
    createEmployeesRouter(databases.employees, databases.timeEntries),
  );
  api.use(
    "/auth",
    createAuthRouter(databases.employees, databases.administrators),
  );
  api.use(
    "/time-entries",
    createTimeEntriesRouter(
      databases.timeEntries,
      databases.commesse,
      databases.employees,
    ),
  );
  api.use(
    "/leave",
    createLeaveRouter(databases.leave, databases.employees),
  );
  api.use((_request, response) => {
    response.status(404).json({ error: "Risorsa API non trovata." });
  });
  return api;
}
