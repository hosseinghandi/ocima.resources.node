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

The frontend includes a demonstration sign-in/registration flow and a sample
administrator workspace. Select an administrator or employee demo profile and
enter any valid email plus a password of at least six characters. Employee
records, reports, sample approval actions, and fallback sample hours are held
in frontend memory and reset on reload; this is a UI demo, not production
authentication or storage.

## Build

```sh
npm run build
npm run build:electron
```

The Electron build creates a Windows installer in `release/`. The desktop app
stores its SQLite database in the operating system's application data directory.
When running the API directly, the database is created in `data/`; set
`OCIMA_DATA_DIR` to choose another location.

## Structure

- `src/` — React app, reusable UI components, pages, and API client
- `shared/` — frontend/backend TypeScript data contracts
- `server/` — Express API and SQLite setup
- `electron/` — Electron main process
- `public/` — static brand assets
