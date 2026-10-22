import { useState, type FormEvent, type ReactNode } from "react";
import { passwordRules, validateNewPassword } from "../../shared/password";
import type { LoginRole } from "../../shared/people";
import { changePassword, forgotPassword, resetPassword } from "../services/people";

const inputClass =
  "mt-2 min-h-12 w-full rounded-lg border border-border-strong bg-white px-3.5 text-sm font-medium text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";

function Modal({
  title,
  subtitle,
  busy,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-sm sm:rounded-2xl sm:p-7"
      >
        <h2 className="text-lg font-extrabold text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p>}
        {children}
      </section>
    </div>
  );
}

function Actions({
  busy,
  submitLabel,
  onClose,
  closeLabel = "Annulla",
  hideSubmit = false,
}: {
  busy: boolean;
  submitLabel: string;
  onClose: () => void;
  closeLabel?: string;
  hideSubmit?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="min-h-11 rounded-lg border border-border px-4 text-sm font-bold text-ink-secondary hover:bg-surface-muted disabled:opacity-50"
      >
        {closeLabel}
      </button>
      {!hideSubmit && (
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? "Attendi..." : submitLabel}
        </button>
      )}
    </div>
  );
}

function Notice({ tone, children }: { tone: "error" | "ok"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg px-3.5 py-2.5 text-sm font-semibold ${
        tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"
      }`}
    >
      {children}
    </p>
  );
}

export function ChangePasswordDialog({
  role,
  id,
  name,
  onClose,
}: {
  role: LoginRole;
  id: number;
  name: string;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const problem = validateNewPassword(next);
    if (problem) return setError(problem);
    if (next !== confirm) return setError("Le due nuove password non coincidono.");
    setBusy(true);
    try {
      await changePassword({ role, id, currentPassword: current, newPassword: next });
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossibile cambiare la password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Cambia password" subtitle={name} busy={busy} onClose={onClose}>
      {done ? (
        <div className="mt-5 space-y-4">
          <Notice tone="ok">Password aggiornata. Usala al prossimo accesso.</Notice>
          <Actions busy={false} submitLabel="" onClose={onClose} closeLabel="Chiudi" hideSubmit />
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
          <label className="block text-sm font-semibold text-ink-secondary">
            Password attuale
            <input required autoFocus type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm font-semibold text-ink-secondary">
            Nuova password
            <input required type="password" autoComplete="new-password" minLength={8} maxLength={64} value={next} onChange={(event) => setNext(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm font-semibold text-ink-secondary">
            Conferma nuova password
            <input required type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className={inputClass} />
          </label>
          <p className="text-xs text-ink-muted">{passwordRules}</p>
          {error && <Notice tone="error">{error}</Notice>}
          <Actions busy={busy} submitLabel="Salva password" onClose={onClose} />
        </form>
      )}
    </Modal>
  );
}

export function ForgotPasswordDialog({
  role,
  id,
  name,
  onClose,
}: {
  role: LoginRole;
  id: number;
  name: string;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setError("");
    try {
      await forgotPassword(role, id);
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossibile inviare la richiesta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Password dimenticata" subtitle={name} busy={busy} onClose={onClose}>
      <div className="mt-5 space-y-4">
        {sent ? (
          <Notice tone="ok">
            Richiesta inviata. Un amministratore la vedrà in “Gestione dipendenti” e ripristinerà la password iniziale; poi potrai cambiarla.
          </Notice>
        ) : (
          <p className="text-sm text-ink-secondary">
            Le password non sono leggibili da nessuno. Invia una richiesta: un amministratore ripristinerà la password iniziale per il tuo profilo.
          </p>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-lg border border-border px-4 text-sm font-bold text-ink-secondary hover:bg-surface-muted disabled:opacity-50">
            {sent ? "Chiudi" : "Annulla"}
          </button>
          {!sent && (
            <button type="button" onClick={() => void send()} disabled={busy} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-60">
              {busy ? "Invio..." : "Invia richiesta"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function AdminResetDialog({
  adminId,
  role,
  id,
  name,
  onClose,
  onDone,
}: {
  adminId: number;
  role: LoginRole;
  id: number;
  name: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await resetPassword({ role, id, adminId, adminPassword: password });
      onDone();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossibile reimpostare la password.");
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Reimposta password"
      subtitle={`${name} tornerà alla password iniziale. Conferma con la tua password.`}
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
        <label className="block text-sm font-semibold text-ink-secondary">
          La tua password (amministratore)
          <input required autoFocus type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <Actions busy={busy} submitLabel="Reimposta" onClose={onClose} />
      </form>
    </Modal>
  );
}
