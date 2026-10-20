import { mkdirSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import express, { type ErrorRequestHandler } from "express";
import type { CreateTimeEntryInput, TimeEntry } from "../shared/timeEntry.js";

class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function validMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function parseEntry(body: unknown): CreateTimeEntryInput {
  if (typeof body !== "object" || body === null) {
    throw new RequestError("Il corpo della richiesta non è valido.", 400);
  }

  const input = body as Record<string, unknown>;
  const project = typeof input.project === "string" ? input.project.trim() : "";
  const activity = typeof input.activity === "string" ? input.activity.trim() : "";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";

  if (!validDate(input.date)) {
    throw new RequestError("Inserisci una data valida.", 400);
  }
  if (!project || project.length > 120) {
    throw new RequestError("La commessa è obbligatoria e deve contenere al massimo 120 caratteri.", 400);
  }
  if (!activity || activity.length > 160) {
    throw new RequestError("L'attività è obbligatoria e deve contenere al massimo 160 caratteri.", 400);
  }
  if (
    typeof input.hours !== "number" ||
    !Number.isFinite(input.hours) ||
    input.hours < 0.5 ||
    input.hours > 24 ||
    !Number.isInteger(input.hours * 2)
  ) {
    throw new RequestError("Le ore devono essere comprese tra 0,5 e 24, a intervalli di mezz'ora.", 400);
  }
  if (notes.length > 1000) {
    throw new RequestError("Le note non possono superare 1000 caratteri.", 400);
  }

  return { date: input.date, project, activity, hours: input.hours, notes };
}

function mapEntry(row: Record<string, unknown>): TimeEntry {
  return {
    id: Number(row.id),
    date: String(row.work_date),
    project: String(row.project),
    activity: String(row.activity),
    hours: Number(row.hours),
    notes: String(row.notes),
    createdAt: String(row.created_at),
  };
}

export async function startServer(options: {
  port?: number;
  host?: string;
  dataDirectory?: string;
  staticDirectory?: string;
} = {}): Promise<{ server: Server; port: number }> {
  const dataDirectory = resolve(
    options.dataDirectory ?? process.env.OCIMA_DATA_DIR ?? join(process.cwd(), "data"),
  );
  mkdirSync(dataDirectory, { recursive: true });
  const database = new DatabaseSync(join(dataDirectory, "ocima-hours.sqlite"));
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_date TEXT NOT NULL,
      project TEXT NOT NULL,
      activity TEXT NOT NULL,
      hours REAL NOT NULL CHECK (hours >= 0.5 AND hours <= 24),
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS time_entries_work_date_idx
      ON time_entries(work_date DESC);
  `);

  const app = express();
  app.use(express.json({ limit: "16kb" }));
  app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
  app.get("/api/time-entries", (request, response, next) => {
    try {
      const month = request.query.month;
      if (!validMonth(month)) {
        throw new RequestError("Seleziona un mese valido nel formato AAAA-MM.", 400);
      }
      const rows = database
        .prepare(
          `SELECT id, work_date, project, activity, hours, notes, created_at
           FROM time_entries WHERE work_date LIKE ?
           ORDER BY work_date DESC, id DESC`,
        )
        .all(`${month}-%`);
      response.json(rows.map((row) => mapEntry(row as Record<string, unknown>)));
    } catch (error) {
      next(error);
    }
  });
  app.post("/api/time-entries", (request, response, next) => {
    try {
      const input = parseEntry(request.body);
      const result = database
        .prepare(
          `INSERT INTO time_entries (work_date, project, activity, hours, notes)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(input.date, input.project, input.activity, input.hours, input.notes);
      const row = database
        .prepare(
          `SELECT id, work_date, project, activity, hours, notes, created_at
           FROM time_entries WHERE id = ?`,
        )
        .get(Number(result.lastInsertRowid));
      if (!row) throw new Error("La registrazione non è stata salvata.");
      response.status(201).json(mapEntry(row as Record<string, unknown>));
    } catch (error) {
      next(error);
    }
  });

  app.use("/api", (_request, response) => {
    response.status(404).json({ error: "Risorsa API non trovata." });
  });

  if (options.staticDirectory) {
    const staticDirectory = resolve(options.staticDirectory);
    app.use(express.static(staticDirectory));
    app.get("/{*path}", (_request, response, next) => {
      response.sendFile(join(staticDirectory, "index.html"), (error) => {
        if (error) next(error);
      });
    });
  }

  const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
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
  };
  app.use(errorHandler);

  const port = options.port ?? Number(process.env.PORT ?? 3001);
  const host = options.host ?? "127.0.0.1";
  const server = createServer(app);
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, host, () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Impossibile determinare la porta del server.");
  }

  server.once("close", () => database.close());
  return { server, port: address.port };
}
