import type { Commessa, CommesseInput } from "../../backend/contracts/commessa";

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body === "object" && body !== null && "error" in body) {
    const message = body.error;
    if (typeof message === "string") return message;
  }
  return `Richiesta non riuscita (${response.status}).`;
}

export async function getCommesse(signal?: AbortSignal): Promise<Commessa[]> {
  const response = await fetch("/api/commesse", { signal });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as Commessa[];
}

export async function createCommessa(
  input: CommesseInput,
): Promise<Commessa> {
  const response = await fetch("/api/commesse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as Commessa;
}

export async function updateCommessa(
  id: number,
  input: CommesseInput,
): Promise<Commessa> {
  const response = await fetch(`/api/commesse/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as Commessa;
}

export async function deleteCommessa(id: number): Promise<void> {
  const response = await fetch(`/api/commesse/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}
