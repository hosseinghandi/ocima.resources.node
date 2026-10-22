import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import type { CommesseInput, Commessa } from "../../shared/commessa.js";
import { RequestError } from "../errors.js";

function parseCommessa(body: unknown): CommesseInput {
  if (typeof body !== "object" || body === null) {
    throw new RequestError("Il corpo della richiesta non è valido.", 400);
  }
  const input = body as Record<string, unknown>;
  const fields = {
    commessa:
      typeof input.commessa === "string" ? input.commessa.trim() : "",
    codiceCliente:
      typeof input.codiceCliente === "string"
        ? input.codiceCliente.trim()
        : "",
    denominazione:
      typeof input.denominazione === "string"
        ? input.denominazione.trim()
        : "",
    disegno: typeof input.disegno === "string" ? input.disegno.trim() : "",
    cliente: typeof input.cliente === "string" ? input.cliente.trim() : "",
  };

  if (!fields.commessa || fields.commessa.length > 120) {
    throw new RequestError(
      "La commessa è obbligatoria e deve contenere al massimo 120 caratteri.",
      400,
    );
  }
  if (!fields.codiceCliente || fields.codiceCliente.length > 120) {
    throw new RequestError(
      "Il codice cliente è obbligatorio e deve contenere al massimo 120 caratteri.",
      400,
    );
  }
  for (const [field, value] of Object.entries(fields)) {
    if (value.length > 240) {
      throw new RequestError(
        `Il campo ${field} non può superare 240 caratteri.`,
        400,
      );
    }
  }
  return fields;
}

function mapCommessa(row: Record<string, unknown>): Commessa {
  return {
    id: Number(row.id),
    commessa: String(row.commessa),
    codiceCliente: String(row.codice_cliente),
    denominazione: String(row.denominazione),
    disegno: String(row.disegno),
    cliente: String(row.cliente),
  };
}

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new RequestError("Identificativo commessa non valido.", 400);
  }
  return id;
}

export function createCommesseRouter(database: DatabaseSync): Router {
  const router = Router();

  router.get("/", (_request, response, next) => {
    try {
      const rows = database
        .prepare(
          `SELECT id, commessa, codice_cliente, denominazione, disegno, cliente
           FROM commesse ORDER BY commessa COLLATE NOCASE, id`,
        )
        .all();
      response.json(
        rows.map((row) => mapCommessa(row as Record<string, unknown>)),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/", (request, response, next) => {
    try {
      const input = parseCommessa(request.body);
      const existing = database
        .prepare("SELECT id FROM commesse WHERE commessa = ?")
        .get(input.commessa);
      if (existing) {
        throw new RequestError("Questa commessa è già presente.", 409);
      }
      const result = database
        .prepare(
          `INSERT INTO commesse
            (commessa, codice_cliente, denominazione, disegno, cliente)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          input.commessa,
          input.codiceCliente,
          input.denominazione,
          input.disegno,
          input.cliente,
        );
      const row = database
        .prepare(
          `SELECT id, commessa, codice_cliente, denominazione, disegno, cliente
           FROM commesse WHERE id = ?`,
        )
        .get(Number(result.lastInsertRowid));
      if (!row) throw new Error("La commessa non è stata salvata.");
      response.status(201).json(mapCommessa(row as Record<string, unknown>));
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", (request, response, next) => {
    try {
      const id = parseId(request.params.id);
      const input = parseCommessa(request.body);
      const existing = database
        .prepare("SELECT id FROM commesse WHERE id = ?")
        .get(id);
      if (!existing) throw new RequestError("Commessa non trovata.", 404);
      const duplicate = database
        .prepare("SELECT id FROM commesse WHERE commessa = ? AND id != ?")
        .get(input.commessa, id);
      if (duplicate) {
        throw new RequestError("Questa commessa è già presente.", 409);
      }
      database
        .prepare(
          `UPDATE commesse SET commessa = ?, codice_cliente = ?,
           denominazione = ?, disegno = ?, cliente = ? WHERE id = ?`,
        )
        .run(
          input.commessa,
          input.codiceCliente,
          input.denominazione,
          input.disegno,
          input.cliente,
          id,
        );
      const row = database
        .prepare(
          `SELECT id, commessa, codice_cliente, denominazione, disegno, cliente
           FROM commesse WHERE id = ?`,
        )
        .get(id);
      if (!row) throw new Error("La commessa aggiornata non è stata trovata.");
      response.json(mapCommessa(row as Record<string, unknown>));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", (request, response, next) => {
    try {
      const result = database
        .prepare("DELETE FROM commesse WHERE id = ?")
        .run(parseId(request.params.id));
      if (result.changes === 0) {
        throw new RequestError("Commessa non trovata.", 404);
      }
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
