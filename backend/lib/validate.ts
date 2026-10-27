import { RequestError } from "./errors.js";

export type Row = Record<string, unknown>;

export function parseBody(body: unknown): Row {
  if (typeof body !== "object" || body === null) {
    throw new RequestError("Il corpo della richiesta non è valido.", 400);
  }
  return body as Row;
}

export function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseId(value: unknown, message: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new RequestError(message, 400);
  return id;
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function parseHours(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0.5 ||
    value > 24 ||
    !Number.isInteger(value * 2)
  ) {
    throw new RequestError(
      "Le ore devono essere comprese tra 0,5 e 24, a intervalli di mezz'ora.",
      400,
    );
  }
  return value;
}

export function parseNotes(value: unknown): string {
  const notes = text(value);
  if (notes.length > 1000) {
    throw new RequestError("Le note non possono superare 1000 caratteri.", 400);
  }
  return notes;
}
