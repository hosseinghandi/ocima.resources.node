import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { hashPassword } from "../password.js";
import commesseSeed from "../seeds/commesse.json" with { type: "json" };
import {
  administratorsSeed,
  DEFAULT_PASSWORD,
  employeesSeed,
} from "../seeds/people.js";

export interface Databases {
  commesse: DatabaseSync;
  timeEntries: DatabaseSync;
  employees: DatabaseSync;
  administrators: DatabaseSync;
  close: () => void;
}

function hasTable(database: DatabaseSync, name: string): boolean {
  return Boolean(
    database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name),
  );
}

function hasColumn(
  database: DatabaseSync,
  table: string,
  column: string,
): boolean {
  return database
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some(
      (value) =>
        (value as Record<string, unknown>).name === column,
    );
}

function initializeCommesse(database: DatabaseSync, legacyPath: string): void {
  database.exec(`
    PRAGMA journal_mode = WAL;
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
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  if (!hasColumn(database, "commesse", "codice_cliente")) {
    database.exec(
      "ALTER TABLE commesse ADD COLUMN codice_cliente TEXT NOT NULL DEFAULT ''",
    );
  }
  database.exec(`
    CREATE INDEX IF NOT EXISTS commesse_codice_cliente_idx
      ON commesse(codice_cliente COLLATE NOCASE)
  `);

  const initialized = database
    .prepare("SELECT value FROM app_metadata WHERE key = ?")
    .get("commesse-initialized-v1");
  if (!initialized) {
    const legacy = existsSync(legacyPath) ? new DatabaseSync(legacyPath) : null;
    const legacyHasCommesse = legacy ? hasTable(legacy, "commesse") : false;
    const insert = database.prepare(
      `INSERT OR IGNORE INTO commesse
        (id, commessa, codice_cliente, denominazione, disegno, cliente)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );

    database.exec("BEGIN IMMEDIATE");
    try {
      if (legacyHasCommesse && legacy) {
        const legacyHasClientCode = hasColumn(
          legacy,
          "commesse",
          "codice_cliente",
        );
        const rows = legacy
          .prepare(
            `SELECT id, commessa, ${
              legacyHasClientCode ? "codice_cliente" : "'' AS codice_cliente"
            }, denominazione, disegno, cliente FROM commesse`,
          )
          .all();
        for (const value of rows) {
          const row = value as Record<string, unknown>;
          insert.run(
            Number(row.id),
            String(row.commessa),
            String(row.codice_cliente ?? ""),
            String(row.denominazione ?? ""),
            String(row.disegno ?? ""),
            String(row.cliente ?? ""),
          );
        }
      }
      if (!legacyHasCommesse) {
        const insertSeed = database.prepare(
          `INSERT OR IGNORE INTO commesse
            (commessa, codice_cliente, denominazione, disegno, cliente)
           VALUES (?, ?, ?, ?, ?)`,
        );
        for (const row of commesseSeed) {
          insertSeed.run(
            row.commessa,
            row.codiceCliente,
            row.denominazione,
            row.disegno,
            row.cliente,
          );
        }
      }
      database
        .prepare("INSERT INTO app_metadata (key, value) VALUES (?, ?)")
        .run("commesse-initialized-v1", "complete");
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    } finally {
      legacy?.close();
    }
  }

  const clientCodesMigrated = database
    .prepare("SELECT value FROM app_metadata WHERE key = ?")
    .get("commesse-client-codes-migrated-v1");
  if (!clientCodesMigrated) {
    const update = database.prepare(
      `UPDATE commesse SET codice_cliente = ?
       WHERE commessa = ? AND trim(codice_cliente) = ''`,
    );
    database.exec("BEGIN IMMEDIATE");
    try {
      for (const row of commesseSeed) {
        update.run(row.codiceCliente, row.commessa);
      }
      database
        .prepare("INSERT INTO app_metadata (key, value) VALUES (?, ?)")
        .run("commesse-client-codes-migrated-v1", "complete");
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }

  const cleanupMarker = database
    .prepare("SELECT value FROM app_metadata WHERE key = ?")
    .get("commesse-empty-records-cleaned-v1");
  if (cleanupMarker) return;

  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare(
        `DELETE FROM commesse
         WHERE trim(denominazione) = ''
           AND trim(disegno) = ''
           AND trim(cliente) = ''`,
      )
      .run();
    database
      .prepare("INSERT INTO app_metadata (key, value) VALUES (?, ?)")
      .run("commesse-empty-records-cleaned-v1", "complete");
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function initializeTimeEntries(
  database: DatabaseSync,
  legacyPath: string,
): void {
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
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // employee_id 0 marks entries saved before employees were tracked.
  if (!hasColumn(database, "time_entries", "employee_id")) {
    database.exec(
      "ALTER TABLE time_entries ADD COLUMN employee_id INTEGER NOT NULL DEFAULT 0",
    );
  }
  database.exec(`
    CREATE INDEX IF NOT EXISTS time_entries_employee_idx
      ON time_entries(employee_id, work_date DESC)
  `);

  const initialized = database
    .prepare("SELECT value FROM app_metadata WHERE key = ?")
    .get("time-entries-migrated-v1");
  if (initialized) return;

  const legacy = existsSync(legacyPath) ? new DatabaseSync(legacyPath) : null;
  database.exec("BEGIN IMMEDIATE");
  try {
    if (legacy && hasTable(legacy, "time_entries")) {
      const rows = legacy
        .prepare(
          `SELECT id, work_date, project, activity, hours, notes, created_at
           FROM time_entries`,
        )
        .all();
      const insert = database.prepare(
        `INSERT OR IGNORE INTO time_entries
          (id, work_date, project, activity, hours, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const value of rows) {
        const row = value as Record<string, unknown>;
        insert.run(
          Number(row.id),
          String(row.work_date),
          String(row.project),
          String(row.activity),
          Number(row.hours),
          String(row.notes ?? ""),
          String(row.created_at),
        );
      }
    }
    database
      .prepare("INSERT INTO app_metadata (key, value) VALUES (?, ?)")
      .run("time-entries-migrated-v1", "complete");
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  } finally {
    legacy?.close();
  }
}

function migrateTimeEntryCommessaCodes(
  timeEntries: DatabaseSync,
  commesse: DatabaseSync,
): void {
  const migrated = timeEntries
    .prepare("SELECT value FROM app_metadata WHERE key = ?")
    .get("time-entry-commessa-codes-migrated-v1");
  if (migrated) return;

  const rows = commesse
    .prepare("SELECT commessa, codice_cliente FROM commesse")
    .all();
  const update = timeEntries.prepare(
    "UPDATE time_entries SET project = ? WHERE project = ?",
  );
  timeEntries.exec("BEGIN IMMEDIATE");
  try {
    for (const value of rows) {
      const row = value as Record<string, unknown>;
      const clientCode = String(row.codice_cliente ?? "");
      if (clientCode) {
        update.run(`${clientCode}${String(row.commessa)}`, String(row.commessa));
      }
    }
    timeEntries
      .prepare("INSERT INTO app_metadata (key, value) VALUES (?, ?)")
      .run("time-entry-commessa-codes-migrated-v1", "complete");
    timeEntries.exec("COMMIT");
  } catch (error) {
    timeEntries.exec("ROLLBACK");
    throw error;
  }
}

// Departments are the `reparto` keys of the activity catalog.
function migrateEmployeeDepartments(database: DatabaseSync): void {
  const key = "employee-departments-v2";
  if (database.prepare("SELECT 1 FROM app_metadata WHERE key = ?").get(key)) {
    return;
  }
  const renames: Record<string, string> = {
    "Assemblaggio meccanico": "Assemb_Meccanico",
    "Officina elettrica": "Officina_Elettrica",
    "Officina meccanica": "Officina_Meccanica",
  };
  database.exec("BEGIN IMMEDIATE");
  try {
    const update = database.prepare(
      "UPDATE employees SET department = ? WHERE department = ?",
    );
    for (const [from, to] of Object.entries(renames)) update.run(to, from);
    database
      .prepare("INSERT INTO app_metadata (key, value) VALUES (?, ?)")
      .run(key, "complete");
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function initializeEmployees(database: DatabaseSync): void {
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      department TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Attivo'
        CHECK (status IN ('Attivo', 'In ferie', 'Inattivo')),
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  const seeded = database
    .prepare("SELECT value FROM app_metadata WHERE key = ?")
    .get("employees-seeded-v1");
  if (seeded) {
    migrateEmployeeDepartments(database);
    return;
  }

  const insert = database.prepare(
    `INSERT OR IGNORE INTO employees (name, department, password_hash)
     VALUES (?, ?, ?)`,
  );
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const row of employeesSeed) {
      insert.run(row.name, row.department, hashPassword(DEFAULT_PASSWORD));
    }
    database
      .prepare("INSERT INTO app_metadata (key, value) VALUES (?, ?)")
      .run("employees-seeded-v1", "complete");
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function initializeAdministrators(database: DatabaseSync): void {
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS administrators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  const seeded = database
    .prepare("SELECT value FROM app_metadata WHERE key = ?")
    .get("administrators-seeded-v1");
  if (seeded) return;

  const insert = database.prepare(
    "INSERT OR IGNORE INTO administrators (name, password_hash) VALUES (?, ?)",
  );
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const row of administratorsSeed) {
      insert.run(row.name, hashPassword(DEFAULT_PASSWORD));
    }
    database
      .prepare("INSERT INTO app_metadata (key, value) VALUES (?, ?)")
      .run("administrators-seeded-v1", "complete");
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

// Existing accounts move once to the new initial password and gain the
// reset-request flag used by the "password dimenticata" flow.
function migratePasswords(
  database: DatabaseSync,
  table: "employees" | "administrators",
): void {
  if (!hasColumn(database, table, "reset_requested")) {
    database.exec(
      `ALTER TABLE ${table} ADD COLUMN reset_requested INTEGER NOT NULL DEFAULT 0`,
    );
  }
  for (const column of ["reset_requested_at", "password_reset_at"]) {
    if (!hasColumn(database, table, column)) {
      database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT`);
    }
  }
  const key = "default-password-v2";
  if (database.prepare("SELECT 1 FROM app_metadata WHERE key = ?").get(key)) {
    return;
  }
  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare(
        `UPDATE ${table} SET password_hash = ?, reset_requested = 0,
         reset_requested_at = NULL, password_reset_at = NULL`,
      )
      .run(hashPassword(DEFAULT_PASSWORD));
    database
      .prepare("INSERT INTO app_metadata (key, value) VALUES (?, ?)")
      .run(key, "complete");
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function openDatabases(dataDirectory: string): Databases {
  const databaseDirectory = join(dataDirectory, "databases");
  const legacyPath = join(dataDirectory, "ocima-hours.sqlite");
  mkdirSync(databaseDirectory, { recursive: true });
  const opened: DatabaseSync[] = [];
  const open = (file: string) => {
    const database = new DatabaseSync(join(databaseDirectory, file));
    opened.push(database);
    return database;
  };
  const closeAll = () => {
    for (const database of opened.reverse()) database.close();
  };

  try {
    const commesse = open("commesse.sqlite");
    const timeEntries = open("time-entries.sqlite");
    const employees = open("employees.sqlite");
    const administrators = open("administrators.sqlite");
    initializeCommesse(commesse, legacyPath);
    initializeTimeEntries(timeEntries, legacyPath);
    migrateTimeEntryCommessaCodes(timeEntries, commesse);
    initializeEmployees(employees);
    initializeAdministrators(administrators);
    migratePasswords(employees, "employees");
    migratePasswords(administrators, "administrators");
    return {
      commesse,
      timeEntries,
      employees,
      administrators,
      close: closeAll,
    };
  } catch (error) {
    closeAll();
    throw error;
  }
}
