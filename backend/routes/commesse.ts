import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import type { CommesseInput, Commessa } from "../contracts/commessa.js";
import { RequestError } from "../lib/errors.js";
import { parseBody, parseId, text, type Row } from "../lib/validate.js";

const columns =
  "id, commessa, codice_cliente, denominazione, disegno, cliente";

function parseCommessa(body: unknown): CommesseInput {
  const input = parseBody(body);
  const fields: CommesseInput = {
    commessa: text(input.commessa),
    codiceCliente: text(input.codiceCliente),
    denominazione: text(input.denominazione),
    disegno: text(input.disegno),
    cliente: text(input.cliente),
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

function mapCommessa(row: Row): Commessa {
  return {
    id: Number(row.id),
    commessa: String(row.commessa),
    codiceCliente: String(row.codice_cliente),
    denominazione: String(row.denominazione),
    disegno: String(row.disegno),
    cliente: String(row.cliente),
  };
}

export function createCommesseRouter(database: DatabaseSync): Router {
  const router = Router();
  const idError = "Identificativo commessa non valido.";

  const find = (id: number): Commessa | undefined => {
    const row = database
      .prepare(`SELECT ${columns} FROM commesse WHERE id = ?`)
      .get(id);
    return row ? mapCommessa(row) : undefined;
  };

  router.get("/", (_request, response) => {
    const rows = database
      .prepare(
        `SELECT ${columns} FROM commesse ORDER BY commessa COLLATE NOCASE, id`,
      )
      .all();
    response.json(rows.map(mapCommessa));
  });

  router.post("/", (request, response) => {
    const input = parseCommessa(request.body);
    if (
      database
        .prepare("SELECT 1 FROM commesse WHERE commessa = ?")
        .get(input.commessa)
    ) {
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
    response.status(201).json(find(Number(result.lastInsertRowid)));
  });

  router.put("/:id", (request, response) => {
    const id = parseId(request.params.id, idError);
    const input = parseCommessa(request.body);
    if (!find(id)) throw new RequestError("Commessa non trovata.", 404);
    if (
      database
        .prepare("SELECT 1 FROM commesse WHERE commessa = ? AND id != ?")
        .get(input.commessa, id)
    ) {
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
    response.json(find(id));
  });

  router.delete("/:id", (request, response) => {
    const result = database
      .prepare("DELETE FROM commesse WHERE id = ?")
      .run(parseId(request.params.id, idError));
    if (result.changes === 0) {
      throw new RequestError("Commessa non trovata.", 404);
    }
    response.status(204).end();
  });

  return router;
}
