import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseEnv } from "node:util";
import { PASSWORD_MIN_LENGTH } from "../contracts/password.js";

// Secrets live in a git-ignored .env file (see .env.example), never in the source.
// readFileSync (not process.loadEnvFile) so the file can be read inside Electron's asar archive.
const envFile = resolve(process.env.OCIMA_ENV_FILE ?? join(process.cwd(), ".env"));
if (existsSync(envFile)) {
  for (const [key, value] of Object.entries(parseEnv(readFileSync(envFile, "utf8")))) {
    process.env[key] ??= value;
  }
}

/** Initial password given to new accounts and used when an administrator resets one. */
export function defaultPassword(): string {
  const value = process.env.OCIMA_DEFAULT_PASSWORD;
  if (!value || value.length < PASSWORD_MIN_LENGTH) {
    throw new Error(
      `OCIMA_DEFAULT_PASSWORD mancante o troppo corta (minimo ${PASSWORD_MIN_LENGTH} caratteri). Impostala nel file ${envFile}.`,
    );
  }
  return value;
}
