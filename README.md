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
starts with the initial password from `OCIMA_DEFAULT_PASSWORD` (stored hashed with scrypt, and
checked by the API). API routes are not yet protected by a session token.

The initial password is not in the source: copy `.env.example` to `.env`
(git-ignored) and set `OCIMA_DEFAULT_PASSWORD` (min. 8 characters). The API
refuses to start creating accounts without it. The packaged desktop app bundles
your `.env`. To start from a clean database, stop the app and delete the
`data/` folder (or Electron's `data` folder under `%APPDATA%`); it is recreated
from the seeds on the next launch.

Passwords: anyone still using the default password is told at login
(dialog plus an amber banner) that it must be changed. The sidebar profile has
**Cambia password** (new password of 8–64
characters, only letters, digits and `! @ # $ % & * _ - . ?`, and not the
initial one). **Password dimenticata** (also on the login dialog) sends a reset
request; an administrator sees it in the amber banner of Gestione dipendenti
(name, request date) and uses **Reimposta password** there, confirming with
their own password, which restores the initial password. The person then sees a "password
reimpostata" notice on the login page when clicking their profile, until they
choose a new password. Passwords are never readable by anyone.

**Ferie e straordinari**: employees record ferie and malattia (date range),
permessi and straordinari (one day, with hours) directly, with no approval
step, and can delete their own entries. A monthly summary shows ferie,
permessi, ore in più and malattia hours (ferie and malattia count 8h per
working day). Administrators see everything, filtered by employee, in
Analisi › Ferie e straordinari. Data lives in
`databases/leave.sqlite`. Password fields have a show/hide eye.

All filters share one layout (labelled fields, "Reimposta filtri"); commessa
searches accept Arrow keys and Enter to pick a result.

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
example, `261035-MMS-3000 MACCHINA MISCELATRICE`). Seed records with all three
descriptive fields empty are excluded.

The app stores commesse, time entries, employees, administrators and leave in separate files under
`<Electron userData>/data/databases/` (`commesse.sqlite`,
`time-entries.sqlite`, `employees.sqlite`, `administrators.sqlite`, `leave.sqlite`). Electron's `userData` directory is local to the
computer, so no cloud account or internet connection is needed for storage.
When running the API directly, `OCIMA_DATA_DIR` selects the data
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

## Use from phones (local network + QR code)

The server listens on all network interfaces (port 3001) and serves the built
app, so phones and tablets on the same Wi-Fi can open it:

```sh
npm run serve   # build + start; prints "Dalla rete locale: http://<ip>:3001"
npm run qr      # prints a QR code and saves ocima-qr.png
```

The installed desktop app does the same on port 3001. Print `ocima-qr.png` and
share it: scanning it opens the app on the phone. Use the PC's Wi-Fi address
(`ipconfig`), not the phone's. The first time, allow Windows Firewall for
port 3001 (admin PowerShell):
`New-NetFirewallRule -DisplayName "Ocima Ore" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -Profile Private`.
The app must be running on the PC, and the address works only on the same
network. Set `HOST=127.0.0.1` to keep it local only.

## Structure

- `src/` — React app, reusable UI components, pages, and API client
- `backend/` — API server (`server.ts`), `routes/`, `db/` (schema, migrations, seeds), `paths/` (data directory), `lib/` (validation, errors, password hashing), and `contracts/` (TypeScript types and rules shared with the frontend)
- `backend-dist/` — compiled backend output
- `src/hooks/` — client-side commesse and time-entry data operations
- `src/utils/` — helpers: `format.ts` (dates and hours), `leave.ts` (leave calculations), `pdf.ts` (PDF export)
- `electron/` — Electron main process
- `public/` — static brand assets
