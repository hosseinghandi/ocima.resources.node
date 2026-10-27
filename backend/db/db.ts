import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { defaultPassword } from "../lib/config.js";
import { hashPassword } from "../lib/password.js";
import commesseSeed from "./seeds/commesse.json" with { type: "json" };
import { administratorsSeed, employeesSeed } from "./seeds/people.js";

export interface Databases {
  commesse: DatabaseSync;
  timeEntries: DatabaseSync;
  employees: DatabaseSync;
  administrators: DatabaseSync;
  leave: DatabaseSync;
  close: () => void;
}

const METADATA_TABLE = `
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

/** Runs `work` in a transaction once per database, recorded in app_metadata. */
function runOnce(database: DatabaseSync, key: string, work: () => void): void {
  if (database.prepare("SELECT 1 FROM app_metadata WHERE key = ?").get(key)) {
    return;
  }
  database.exec("BEGIN IMMEDIATE");
  try {
    work();
    database
      .prepare("INSERT INTO app_metadata (key, value) VALUES (?, ?)")
      .run(key, "complete");
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function initializeCommesse(database: DatabaseSync): void {
  database.exec(`
    ${METADATA_TABLE}
    CREATE TABLE IF NOT EXISTS commesse (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commessa TEXT NOT NULL COLLATE NOCASE UNIQUE,
      codice_cliente TEXT NOT NULL DEFAULT '',
      denominazione TEXT NOT NULL DEFAULT '',
      disegno TEXT NOT NULL DEFAULT '',
      cliente TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS commesse_cliente_idx
      ON commesse(cliente COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS commesse_codice_cliente_idx
      ON commesse(codice_cliente COLLATE NOCASE);
  `);

  runOnce(database, "commesse-seeded", () => {
    const insert = database.prepare(
      `INSERT OR IGNORE INTO commesse
        (commessa, codice_cliente, denominazione, disegno, cliente)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (const row of commesseSeed) {
      if (!row.denominazione.trim() && !row.disegno.trim() && !row.cliente.trim()) continue;
      insert.run(
        row.commessa,
        row.codiceCliente,
        row.denominazione,
        row.disegno,
        row.cliente,
      );
    }
  });
}

function initializeTimeEntries(database: DatabaseSync): void {
  database.exec(`
    ${METADATA_TABLE}
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      work_date TEXT NOT NULL,
      project TEXT NOT NULL,
      activity TEXT NOT NULL,
      hours REAL NOT NULL CHECK (hours >= 0.5 AND hours <= 24),
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS time_entries_work_date_idx
      ON time_entries(work_date DESC);
    CREATE INDEX IF NOT EXISTS time_entries_employee_idx
      ON time_entries(employee_id, work_date DESC);
  `);
}

const ACCOUNT_COLUMNS = `
  password_hash TEXT NOT NULL,
  reset_requested INTEGER NOT NULL DEFAULT 0,
  reset_requested_at TEXT,
  password_reset_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
`;

function initializeEmployees(database: DatabaseSync): void {
  database.exec(`
    ${METADATA_TABLE}
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      department TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Attivo'
        CHECK (status IN ('Attivo', 'In ferie', 'Inattivo')),
      ${ACCOUNT_COLUMNS}
    );
  `);

  runOnce(database, "employees-seeded", () => {
    const insert = database.prepare(
      `INSERT OR IGNORE INTO employees (name, department, password_hash)
       VALUES (?, ?, ?)`,
    );
    for (const row of employeesSeed) {
      insert.run(row.name, row.department, hashPassword(defaultPassword()));
    }
  });
}

function initializeAdministrators(database: DatabaseSync): void {
  database.exec(`
    ${METADATA_TABLE}
    CREATE TABLE IF NOT EXISTS administrators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      ${ACCOUNT_COLUMNS}
    );
  `);

  runOnce(database, "administrators-seeded", () => {
    const insert = database.prepare(
      "INSERT OR IGNORE INTO administrators (name, password_hash) VALUES (?, ?)",
    );
    for (const row of administratorsSeed) {
      insert.run(row.name, hashPassword(defaultPassword()));
    }
  });
}

function initializeLeave(database: DatabaseSync): void {
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS leave_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      type TEXT NOT NULL
        CHECK (type IN ('Ferie', 'Permesso', 'Straordinario', 'Malattia')),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      hours REAL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS leave_records_employee_idx
      ON leave_records (employee_id, start_date);
  `);
}

export function openDatabases(dataDirectory: string): Databases {
  const databaseDirectory = join(dataDirectory, "databases");
  mkdirSync(databaseDirectory, { recursive: true });
  const opened: DatabaseSync[] = [];
  const open = (file: string) => {
    const database = new DatabaseSync(join(databaseDirectory, file));
    opened.push(database);
    return database;
  };
  const close = () => {
    for (const database of opened.reverse()) database.close();
  };

  try {
    const databases: Databases = {
      commesse: open("commesse.sqlite"),
      timeEntries: open("time-entries.sqlite"),
      employees: open("employees.sqlite"),
      administrators: open("administrators.sqlite"),
      leave: open("leave.sqlite"),
      close,
    };
    initializeCommesse(databases.commesse);
    initializeTimeEntries(databases.timeEntries);
    initializeEmployees(databases.employees);
    initializeAdministrators(databases.administrators);
    initializeLeave(databases.leave);
    return databases;
  } catch (error) {
    close();
    throw error;
  }
}
