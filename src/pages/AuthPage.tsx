import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PasswordInput } from "../components/PasswordInput";
import { Icon } from "../components/Icon";
import { ForgotPasswordDialog } from "../components/PasswordDialogs";
import { useEmployees } from "../hooks/useEmployees";
import { getAdministrators, login } from "../services/people";
import { departmentLabel } from "../../backend/contracts/activities";
import { formatDateTime } from "../utils/format";
import type { Administrator, LoginRole, Session } from "../../backend/contracts/people";

interface Person {
  id: number;
  name: string;
  detail: string;
  passwordResetAt: string | null;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AuthPage({ onSignIn }: { onSignIn: (session: Session) => void }) {
  const [role, setRole] = useState<LoginRole>("employee");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Person | null>(null);
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [adminsError, setAdminsError] = useState("");
  const { employees, loading: employeesLoading, error: employeesError, refresh } = useEmployees();

  useEffect(() => {
    const controller = new AbortController();
    getAdministrators(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setAdministrators(result);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setAdminsError(cause instanceof Error ? cause.message : "Impossibile caricare gli amministratori.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAdminsLoading(false);
      });
    return () => controller.abort();
  }, []);

  const people: Person[] = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("it");
    const source: Person[] =
      role === "admin"
        ? administrators.map((item) => ({ id: item.id, name: item.name, detail: "Amministratore", passwordResetAt: item.passwordResetAt }))
        : employees
            .filter((item) => item.status !== "Inattivo")
            .map((item) => ({ id: item.id, name: item.name, detail: departmentLabel(item.department), passwordResetAt: item.passwordResetAt }));
    return source.filter((item) =>
      `${item.name} ${item.detail}`.toLocaleLowerCase("it").includes(normalized),
    );
  }, [role, administrators, employees, query]);

  const loading = role === "admin" ? adminsLoading : employeesLoading;
  const error = role === "admin" ? adminsError : employeesError;

  return (
    <main className="min-h-dvh bg-white lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(520px,1fr)]">
      <section className="relative hidden overflow-hidden bg-[#17251d] px-12 py-10 text-white lg:flex lg:flex-col xl:px-20">
        <div className="relative z-10">
          <img src="/logo.png" alt="Ocima" className="h-auto w-28 max-w-full object-contain" />
        </div>
        <div className="relative z-10 my-auto max-w-lg">
          <p className="text-sm font-semibold tracking-wide text-emerald-200">OCIMA</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight xl:text-5xl">
            Inserimento orario
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/65">
            Gestione semplice delle ore di lavoro e delle attività.
          </p>
        </div>
        <div className="relative z-10 text-xs text-white/40">© 2026 Ocima · Registro attività</div>
        <div className="absolute -right-24 top-1/4 size-96 rounded-full border border-white/5" />
        <div className="absolute -right-10 top-[30%] size-64 rounded-full border border-white/5" />
        <div className="absolute -bottom-40 -left-32 size-96 rounded-full bg-primary/15 blur-3xl" />
      </section>

      <section className="flex min-h-dvh flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center gap-3 lg:hidden">
          <img src="/logo.png" alt="Ocima" className="h-10 w-20 object-contain" />
        </div>
        <div className="mx-auto my-auto w-full max-w-[560px] py-6">
          <div className="mb-6">
            <p className="text-sm font-bold text-primary">Bentornato</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Accedi al tuo spazio</h2>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              Scegli il tuo profilo, poi inserisci la password.
            </p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-surface-muted p-1">
            {(["employee", "admin"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={role === item}
                onClick={() => {
                  setRole(item);
                  setQuery("");
                }}
                className={`min-h-10 rounded-lg text-sm font-bold transition ${
                  role === item ? "bg-white text-ink shadow-sm" : "text-ink-secondary"
                }`}
              >
                {item === "admin" ? "Amministratore" : "Dipendente"}
              </button>
            ))}
          </div>

          <label className="relative mb-3 block">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && people.length > 0) {
                  event.preventDefault();
                  setSelected(people[0]);
                }
              }}
              placeholder={role === "admin" ? "Cerca amministratore..." : "Cerca il tuo nome..."}
              aria-label={role === "admin" ? "Cerca amministratore" : "Cerca dipendente"}
              className="min-h-12 w-full rounded-lg border border-border bg-surface-muted/60 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>

          {error && (
            <p role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">
              <span>{error}</span>
              {role === "employee" && (
                <button type="button" onClick={() => void refresh()} className="shrink-0 underline">
                  Riprova
                </button>
              )}
            </p>
          )}

          <ul
            aria-label={role === "admin" ? "Elenco amministratori" : "Elenco dipendenti"}
            className="h-[min(30rem,calc(100dvh-23rem))] min-h-64 divide-y divide-border overflow-y-auto overscroll-contain rounded-xl border border-border bg-white"
          >
            {loading ? (
              <li className="px-4 py-8 text-center text-sm text-ink-secondary">Caricamento...</li>
            ) : people.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-ink-secondary">Nessun profilo trovato.</li>
            ) : (
              people.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(person)}
                    className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2 text-left transition hover:bg-primary-tint/50 focus-visible:bg-primary-tint/50 focus-visible:outline-none"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-tint text-xs font-extrabold text-primary-dark">
                      {initials(person.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">{person.name}</span>
                      <span className="block truncate text-xs text-ink-muted">{person.detail}</span>
                    </span>
                    {person.passwordResetAt && (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">Password reimpostata</span>
                    )}
                    <Icon name="chevron" className="size-4 shrink-0 text-ink-muted" />
                  </button>
                </li>
              ))
            )}
          </ul>
          {!loading && (
            <p className="mt-2 text-center text-xs text-ink-muted">
              {people.length} {people.length === 1 ? "profilo" : "profili"}
            </p>
          )}
        </div>
        <div className="pb-1 text-center text-xs text-ink-muted">Un accesso semplice, da qualsiasi dispositivo</div>
      </section>

      {selected && (
        <PasswordDialog
          role={role}
          person={selected}
          onCancel={() => setSelected(null)}
          onSignIn={onSignIn}
        />
      )}
    </main>
  );
}

function PasswordDialog({
  role,
  person,
  onCancel,
  onSignIn,
}: {
  role: LoginRole;
  person: Person;
  onCancel: () => void;
  onSignIn: (session: Session) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      onSignIn(await login({ role, id: person.id, password }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Accesso non riuscito.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !submitting) onCancel();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-dialog-title"
        className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-sm sm:rounded-2xl sm:p-7"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-tint text-sm font-extrabold text-primary-dark">
            {initials(person.name)}
          </span>
          <div className="min-w-0">
            <h2 id="password-dialog-title" className="truncate text-lg font-extrabold text-ink">
              {person.name}
            </h2>
            <p className="truncate text-xs text-ink-muted">{person.detail}</p>
          </div>
        </div>
        <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
          {person.passwordResetAt && (
            <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-semibold text-amber-900">
              La tua password è stata reimpostata dall’amministratore il {formatDateTime(person.passwordResetAt)}. Accedi con la password iniziale, poi cambiala da “Cambia password”.
            </p>
          )}
          <label className="block text-sm font-semibold text-ink-secondary">
            Password
            <PasswordInput
              required
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-lg border border-border-strong bg-white px-3.5 text-sm font-medium text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            disabled={submitting}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Password dimenticata?
          </button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="min-h-11 rounded-lg border border-border px-4 text-sm font-bold text-ink-secondary hover:bg-surface-muted disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {submitting ? "Accesso..." : "Accedi"}
              <Icon name="arrow" className="size-4" />
            </button>
          </div>
        </form>
      </section>
      {forgotOpen && (
        <ForgotPasswordDialog role={role} id={person.id} name={person.name} onClose={() => setForgotOpen(false)} />
      )}
    </div>
  );
}
