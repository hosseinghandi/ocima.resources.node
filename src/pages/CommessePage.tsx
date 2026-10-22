import { useMemo, useState, type FormEvent } from "react";
import { Icon } from "../components/Icon";
import { useCommesse } from "../hooks/useCommesse";
import type { Commessa } from "../../shared/commessa";
import {
  commessaSearchText,
  formatCommessaCode,
} from "../../shared/commessa";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-border-strong bg-white px-3 text-sm font-medium text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";

export function CommessePage() {
  const {
    commesse,
    loading,
    error,
    add,
    edit,
    remove,
    refresh,
    clearError,
  } = useCommesse();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Commessa | null>(null);

  const filteredCommesse = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("it");
    if (!normalized) return commesse;
    return commesse.filter((item) => commessaSearchText(item).includes(normalized));
  }, [commesse, query]);

  async function handleSave(input: Omit<Commessa, "id">) {
    setSaving(true);
    try {
      if (editing) await edit(editing.id, input);
      else await add(input);
      setFormOpen(false);
      setEditing(null);
    } catch (cause) {
      if (!(cause instanceof Error)) console.error(cause);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(item: Commessa) {
    if (
      !window.confirm(
        `Vuoi eliminare la commessa ${formatCommessaCode(item)}?`,
      )
    )
      return;
    setRemovingId(item.id);
    try {
      await remove(item.id);
    } catch (cause) {
      if (!(cause instanceof Error)) console.error(cause);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">
            Spazio amministratore
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Commesse
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Archivio commesse, denominazioni, disegni e clienti.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            clearError();
            setFormOpen(true);
          }}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary-hover sm:w-auto"
        >
          <Icon name="plus" className="size-4" /> Aggiungi commessa
        </button>
      </header>

      {error && !formOpen && (
        <div
          className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={clearError}
            aria-label="Chiudi avviso"
            className="shrink-0 font-bold"
          >
            Chiudi
          </button>
          {commesse.length === 0 && (
            <button
              type="button"
              onClick={() => void refresh().catch(() => {})}
              className="shrink-0 font-bold underline"
            >
              Riprova
            </button>
          )}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-extrabold text-ink">Archivio commesse</h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {loading
                ? "Caricamento commesse..."
                : `${filteredCommesse.length} di ${commesse.length} ${commesse.length === 1 ? "commessa" : "commesse"}`}
            </p>
          </div>
          <label className="relative block w-full sm:w-80">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca commessa, cliente, disegno..."
              className="min-h-10 w-full rounded-lg border border-border bg-surface-muted/60 pl-9 pr-3 text-sm outline-none focus:border-primary"
              aria-label="Cerca commesse"
            />
          </label>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-ink-secondary">
            Caricamento archivio...
          </p>
        ) : commesse.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-secondary">
            Nessuna commessa registrata.
          </p>
        ) : filteredCommesse.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-secondary">
            Nessuna commessa corrisponde alla ricerca.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-surface-muted/70 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-5 py-3">Commessa</th>
                  <th className="px-4 py-3">Denominazione</th>
                  <th className="px-4 py-3">Disegno</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCommesse.map((item) => (
                  <tr key={item.id} className="hover:bg-primary-tint/30">
                    <td className="px-5 py-3.5 text-sm font-bold text-ink">
                      {formatCommessaCode(item)}
                    </td>
                    <td className="max-w-sm px-4 py-3.5 text-sm text-ink-secondary">
                      {item.denominazione || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink-secondary">
                      {item.disegno || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink-secondary">
                      {item.cliente || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          clearError();
                          setEditing(item);
                          setFormOpen(true);
                        }}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary-tint"
                        aria-label={`Modifica commessa ${formatCommessaCode(item)}`}
                      >
                        Modifica
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRemove(item)}
                        disabled={removingId === item.id}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                        aria-label={`Elimina commessa ${formatCommessaCode(item)}`}
                      >
                        {removingId === item.id ? "Eliminazione..." : "Elimina"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen && (
        <CommessaForm
          commessa={editing}
          error={error}
          saving={saving}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
            clearError();
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function CommessaForm({
  commessa: initialCommessa,
  error,
  saving,
  onClose,
  onSave,
}: {
  commessa: Commessa | null;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSave: (input: Omit<Commessa, "id">) => Promise<void>;
}) {
  const [commessa, setCommessa] = useState(initialCommessa?.commessa ?? "");
  const [codiceCliente, setCodiceCliente] = useState(
    initialCommessa?.codiceCliente ?? "",
  );
  const [denominazione, setDenominazione] = useState(initialCommessa?.denominazione ?? "");
  const [disegno, setDisegno] = useState(initialCommessa?.disegno ?? "");
  const [cliente, setCliente] = useState(initialCommessa?.cliente ?? "");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave({
      commessa: commessa.trim(),
      codiceCliente: codiceCliente.trim(),
      denominazione: denominazione.trim(),
      disegno: disegno.trim(),
      cliente: cliente.trim(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="commessa-form-title"
        className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-primary">
              {initialCommessa ? "Modifica record" : "Nuovo record"}
            </p>
            <h2
              id="commessa-form-title"
              className="mt-1 text-xl font-extrabold text-ink"
            >
              {initialCommessa ? "Modifica commessa" : "Aggiungi commessa"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Chiudi"
            className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted disabled:opacity-50"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
              role="alert"
            >
              {error}
            </p>
          )}
          <label className="block text-sm font-semibold text-ink">
            Codice cliente
            <input
              required
              maxLength={120}
              value={codiceCliente}
              onChange={(event) => setCodiceCliente(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-semibold text-ink">
            Commessa
            <input
              required
              maxLength={120}
              autoFocus
              value={commessa}
              onChange={(event) => setCommessa(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-semibold text-ink">
            Denominazione
            <input
              maxLength={240}
              value={denominazione}
              onChange={(event) => setDenominazione(event.target.value)}
              className={inputClass}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-ink">
              Disegno
              <input
                maxLength={240}
                value={disegno}
                onChange={(event) => setDisegno(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-semibold text-ink">
              Cliente
              <input
                maxLength={240}
                value={cliente}
                onChange={(event) => setCliente(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-10 rounded-lg border border-border px-4 text-sm font-bold text-ink-secondary hover:bg-surface-muted disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-10 rounded-lg bg-primary px-4 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {saving
                ? "Salvataggio..."
                : initialCommessa
                  ? "Salva modifiche"
                  : "Salva commessa"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
