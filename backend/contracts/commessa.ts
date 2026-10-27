export interface Commessa {
  id: number;
  commessa: string;
  codiceCliente: string;
  denominazione: string;
  disegno: string;
  cliente: string;
}

export type CommesseInput = Omit<Commessa, "id">;

export function formatCommessaCode(
  commessa: Pick<Commessa, "commessa" | "codiceCliente">,
): string {
  return `${commessa.codiceCliente}${commessa.commessa}`;
}

export function commessaSearchText(commessa: Commessa): string {
  return `${formatCommessaLabel(commessa)} ${commessa.commessa} ${commessa.disegno} ${commessa.cliente}`.toLocaleLowerCase(
    "it",
  );
}

export function formatCommessaLabel(
  commessa: Pick<
    Commessa,
    "commessa" | "codiceCliente" | "denominazione"
  >,
): string {
  const code = formatCommessaCode(commessa);
  return commessa.denominazione
    ? `${code}-${commessa.denominazione}`
    : code;
}
