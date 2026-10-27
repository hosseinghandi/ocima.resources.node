import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

/** Writable data folder: Electron sets OCIMA_DATA_DIR, other runs use ./data. */
export function resolveDataDirectory(override?: string): string {
  const directory = resolve(
    override ?? process.env.OCIMA_DATA_DIR ?? join(process.cwd(), "data"),
  );
  mkdirSync(directory, { recursive: true });
  return directory;
}
