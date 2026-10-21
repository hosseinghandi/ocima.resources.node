import { useState, type FormEvent } from "react";
import { Icon } from "../components/Icon";
import type { Employee } from "../demoData";
import type { UserRole } from "../App";

export function AuthPage({
  employees,
  onSignIn,
  onRegister,
}: {
  employees: Employee[];
  onSignIn: (role: UserRole, employeeId?: string) => void;
  onRegister: (employee: Employee) => void;
}) {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [role, setRole] = useState<UserRole>("admin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (mode === "register") {
      if (employees.some((employee) => employee.email.toLowerCase() === email.trim().toLowerCase())) {
        setError("Esiste già un account con questa email.");
        return;
      }
      const fullName = name.trim();
      const initials = fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
      onRegister({
        id: `employee-${Date.now()}`,
        name: fullName,
        email: email.trim(),
        phone: "Da aggiungere",
        role: "Nuovo dipendente",
        department: "Da assegnare",
        contract: "Da definire",
        status: "Attivo",
        location: "Da assegnare",
        startDate: new Date().toISOString().slice(0, 10),
        monthlyHours: 0,
        targetHours: 168,
        initials,
        color: "bg-emerald-100 text-emerald-800",
      });
      return;
    }
    onSignIn(role);
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
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

      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center gap-3 lg:hidden">
          <img src="/logo.png" alt="Ocima" className="h-10 w-20 object-contain" />
        </div>
        <div className="mx-auto my-auto w-full max-w-[440px] py-10">
          <div className="mb-8">
            <p className="text-sm font-bold text-primary">{mode === "signin" ? "Bentornato" : "Unisciti al team"}</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">
              {mode === "signin" ? "Accedi al tuo spazio" : "Crea il tuo account"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              {mode === "signin"
                ? "Accedi per gestire le attività e consultare i dati del team."
                : "Inserisci i tuoi dati per creare un account."}
            </p>
          </div>

          {mode === "signin" && (
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-surface-muted p-1">
              {(["admin", "employee"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRole(item)}
                  className={`min-h-10 rounded-lg text-sm font-bold transition ${
                    role === item ? "bg-white text-ink shadow-sm" : "text-ink-secondary"
                  }`}
                >
                  {item === "admin" ? "Amministratore" : "Dipendente"}
                </button>
              ))}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "register" && (
              <label className="block text-sm font-semibold text-ink-secondary">
                Nome completo
                <input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Il tuo nome" className={authInput} />
              </label>
            )}
            <label className="block text-sm font-semibold text-ink-secondary">
              Email
              <span className="relative block">
                <Icon name="mail" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@azienda.it" className={`${authInput} pl-10`} />
              </span>
            </label>
            <label className="block text-sm font-semibold text-ink-secondary">
              Password
              <input required type="password" minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Almeno 6 caratteri" className={authInput} />
            </label>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">{error}</p>}
            <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover">
              {mode === "signin" ? "Accedi" : "Crea account"}
              <Icon name="arrow" className="size-4" />
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-ink-secondary">
            {mode === "signin" ? "Non hai un account?" : "Hai già un account?"}{" "}
            <button type="button" className="font-bold text-primary hover:underline" onClick={() => { setMode(mode === "signin" ? "register" : "signin"); setError(""); }}>
              {mode === "signin" ? "Registrati" : "Accedi"}
            </button>
          </p>
        </div>
        <div className="pb-1 text-center text-xs text-ink-muted">Un accesso semplice, da qualsiasi dispositivo</div>
      </section>
    </main>
  );
}

const authInput =
  "mt-2 min-h-12 w-full rounded-lg border border-border-strong bg-white px-3.5 text-sm font-medium text-ink outline-none transition placeholder:text-ink-muted focus:border-primary focus:ring-4 focus:ring-primary/10";
