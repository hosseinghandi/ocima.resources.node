# Ocima Ore

A modular hours-tracking app with a React/Vite frontend, an Express API, a local
SQLite database, and an optional Electron desktop installer.

## Requirements

- Node.js 22.5 or newer (the API uses Node's built-in `node:sqlite` module)
- npm

## Development

Install dependencies with `npm install`, then run these in separate terminals:

```sh
npm run backend
npm run dev
```

The Vite frontend is available at `http://localhost:5173` and proxies API
requests to `http://127.0.0.1:3001`. To run both with Electron during
development, use `npm run electron:dev`.

The login page lists the active employees (searchable, scrollable) or the
administrators. Selecting a person opens a password dialog; every account
starts with the initial password `12345678` (stored hashed with scrypt, and
checked by the API). API routes are not yet protected by a session token.

Passwords: the sidebar profile has **Cambia password** (new password of 8–64
characters, only letters, digits and `! @ # $ % & * _ - . ?`, and not the
initial one). **Password dimenticata** (also on the login dialog) sends a reset
request; an administrator sees it in the amber banner of Gestione dipendenti
(name, request date) and uses **Reimposta password** there, confirming with
their own password, which restores `12345678`. The person then sees a "password
reimpostata" notice on the login page when clicking their profile, until they
choose a new password. Passwords are never readable by anyone.

The administrator's **Dipendenti** page manages the employee database (name,
department, email, phone, status): add, edit, and delete. The logged-in
employee is pre-filled on the hours entry form and each time entry is linked
to them. An employee that already has time entries cannot be deleted; set the
status to *Inattivo* instead (they then disappear from the login list).
Administrators (Tommaso Fera, Raffaele Amico, Vincenzo Casone) have their own
small database. Both are seeded once on first launch.

The administrator's **Commesse** page uses a local SQLite database. On first
launch, the supplied commission register is copied into the database; later
starts use the saved database, not the seed file. Administrators can search,
add, edit, and delete records with the fields Codice cliente, Commessa,
Denominazione, Disegno, and Cliente. Employee entry and administrator analysis
searches use this editable archive. Commesse are shown as the customer code
followed by the commessa number, with the denomination in search results (for
example, `261035-MMS-3000 MACCHINA MISCELATRICE`). Existing databases receive
the customer codes from the supplied register once at startup. Seed records
with all three descriptive fields empty are excluded. Existing databases
remove these empty records once at startup; saved work-hour records are not
deleted.

The app stores commesse, time entries, employees and administrators in separate files under
`<Electron userData>/data/databases/` (`commesse.sqlite`,
`time-entries.sqlite`, `employees.sqlite`, `administrators.sqlite`). Electron's `userData` directory is local to the
computer, so no cloud account or internet connection is needed for storage.
On first launch, data in the previous `data/ocima-hours.sqlite` file is
migrated to these separate databases and the original file is left in place
as a backup. When running the API directly, `OCIMA_DATA_DIR` selects the data
directory; the default is `data/`.

## Build

```sh
npm run backend:build
npm run backend:production
npm run desktop
npm run desktop:built
npm run build
npm run build:electron
```

`backend:build` compiles the API into `backend-dist/`. `backend:production`
builds and runs that compiled API. `desktop` builds the frontend and backend,
then launches Electron using the production files and local databases.
`desktop:built` launches Electron using files built previously. The Electron
build creates a Windows installer in `release/`. The database
files are created on first app launch in Electron's application data directory
and remain there when the application is updated or reinstalled. Uninstalling
the app does not necessarily remove this user data.

## Structure

- `src/` — React app, reusable UI components, pages, and API client
- `shared/` — frontend/backend TypeScript data contracts
- `backend/` — API entry point, Express app, routes, database setup, and seed data
- `backend-dist/` — compiled backend output
- `src/hooks/` — client-side commesse and time-entry data operations
- `electron/` — Electron main process
- `public/` — static brand assets
