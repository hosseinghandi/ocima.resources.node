import { join, resolve } from "node:path";
import express from "express";
import type { Databases } from "./database/index.js";
import { RequestError } from "./errors.js";
import { createCommesseRouter } from "./routes/commesse.js";
import { createActivitiesRouter } from "./routes/activities.js";
import { createAuthRouter } from "./routes/auth.js";
import { createEmployeesRouter } from "./routes/employees.js";
import { createTimeEntriesRouter } from "./routes/timeEntries.js";

export function createApp(
  databases: Databases,
  staticDirectory?: string,
): express.Express {
  const app = express();
  app.use(express.json({ limit: "20mb" }));
  app.get("/api/health", (_request, response) =>
    response.json({ status: "ok" }),
  );
  app.use("/api/commesse", createCommesseRouter(databases.commesse));
  app.use("/api/activities", createActivitiesRouter());
  app.use(
    "/api/employees",
    createEmployeesRouter(databases.employees, databases.timeEntries),
  );
  app.use(
    "/api/auth",
    createAuthRouter(databases.employees, databases.administrators),
  );
  app.use(
    "/api/time-entries",
    createTimeEntriesRouter(
      databases.timeEntries,
      databases.commesse,
      databases.employees,
    ),
  );
  app.use("/api", (_request, response) => {
    response.status(404).json({ error: "Risorsa API non trovata." });
  });

  if (staticDirectory) {
    const directory = resolve(staticDirectory);
    app.use(express.static(directory));
    app.get("/{*path}", (_request, response, next) => {
      response.sendFile(join(directory, "index.html"), (error) => {
        if (error) next(error);
      });
    });
  }

  app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
    if (response.headersSent) {
      next(error);
      return;
    }
    if (error instanceof RequestError) {
      response.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof SyntaxError && "body" in error) {
      response.status(400).json({ error: "Il JSON inviato non è valido." });
      return;
    }
    console.error("Errore del server:", error);
    response.status(500).json({ error: "Errore interno del server." });
  });
  return app;
}
