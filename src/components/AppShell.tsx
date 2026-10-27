import { useState } from "react";
import { Icon } from "./Icon";
import { ChangePasswordDialog } from "./PasswordDialogs";
import type { Page, UserRole } from "../App";

type NavIcon = "briefcase" | "chart" | "people" | "note" | "clock" | "calendar";

type NavGroup = {
  title: string;
  items: { id: Page; label: string; icon: NavIcon }[];
};

const adminNavigation: NavGroup[] = [
  {
    title: "Gestionale",
    items: [
      { id: "employees", label: "Gestione dipendenti", icon: "people" },
      { id: "commesse", label: "Gestione commesse", icon: "briefcase" },
    ],
  },
  {
    title: "Analisi",
    items: [
      { id: "activity", label: "Attività dipendenti", icon: "note" },
      { id: "reports", label: "Analisi commesse", icon: "chart" },
      { id: "leave", label: "Ferie e straordinari", icon: "calendar" },
    ],
  },
];

const employeeNavigation: NavGroup[] = [
  {
    title: "Il tuo spazio",
    items: [
      { id: "hours", label: "Inserisci ore", icon: "clock" },
      { id: "leave", label: "Ferie e straordinari", icon: "calendar" },
      { id: "summary", label: "Riepilogo", icon: "chart" },
    ],
  },
];

export function AppShell({
  page,
  role,
  userId,
  userName,
  mustChangePassword,
  onPasswordChanged,
  onPageChange,
  onSignOut,
  children,
}: {
  page: Page;
  role: UserRole;
  userId: number;
  userName: string;
  mustChangePassword: boolean;
  onPasswordChanged: () => void;
  onPageChange: (page: Page) => void;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(mustChangePassword);
  const navigation = role === "admin" ? adminNavigation : employeeNavigation;
  const pageLabel =
    navigation.flatMap((group) => group.items).find((item) => item.id === page)?.label ?? "Ocima";
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      {mobileOpen && (
        <button
          aria-label="Chiudi navigazione"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`sidebar fixed inset-y-0 left-0 z-40 flex w-72 flex-col px-4 py-5 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-2 py-2">
          <img src="/logo.png" alt="Ocima" className="h-10 w-28 object-contain" />
        </div>

        <div className="mt-5 flex flex-col gap-4 overflow-y-auto">
          {navigation.map((group) => (
            <div key={group.title}>
              <div className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-sidebar-muted">
                {group.title}
              </div>
              <nav className="flex flex-col gap-1.5" aria-label={group.title}>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    aria-current={page === item.id ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                      page === item.id
                        ? "bg-primary text-white shadow-sm"
                        : "text-sidebar-muted hover:bg-white/8 hover:text-white"
                    }`}
                    onClick={() => {
                      onPageChange(item.id);
                      setMobileOpen(false);
                    }}
                  >
                    <Icon name={item.icon} className="size-5" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary-soft">
              {initials}
            </span>
            <div>
              <div className="max-w-40 truncate text-sm font-bold text-white">{userName}</div>
              <div className="text-xs text-sidebar-muted">
                {role === "admin" ? "Amministratore" : "Dipendente"}
              </div>
            </div>
          </div>
          <div className="mt-3 border-t border-white/10 pt-2">
            <button
              type="button"
              onClick={() => setPasswordDialogOpen(true)}
              className="min-h-10 w-full rounded-md px-2 text-left text-xs font-semibold text-sidebar-muted transition hover:bg-white/8 hover:text-white"
            >
              Cambia password
            </button>
          </div>
        </div>
      </aside>

      {passwordDialogOpen && (
        <ChangePasswordDialog
          role={role}
          id={userId}
          name={userName}
          notice={
            mustChangePassword
              ? "Stai usando la password predefinita. Per la tua sicurezza devi sceglierne una nuova."
              : undefined
          }
          onChanged={onPasswordChanged}
          onClose={() => setPasswordDialogOpen(false)}
        />
      )}

      <main className="min-h-screen min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              aria-label="Apri navigazione"
              className="grid size-10 place-items-center rounded-lg border border-border text-ink-secondary hover:bg-surface-muted lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Icon name="menu" className="size-5" />
            </button>
            <div className="hidden text-sm font-semibold text-ink-secondary sm:block">
              <img src="/logo.png" alt="Ocima" className="inline-block h-6 w-12 object-contain align-middle" />
              <span className="mx-2 text-border-strong">/</span>
              {pageLabel}
            </div>
            <div className="sm:hidden">
              <img src="/logo.png" alt="Ocima" className="h-7 w-14 object-contain" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full bg-primary-tint px-3 py-1.5 text-xs font-bold text-primary-dark sm:flex">
              <span className="size-2 rounded-full bg-primary" />
              {role === "admin" ? "Area amministratore" : "Area dipendente"}
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="min-h-10 rounded-lg border border-border px-3 text-xs font-bold text-ink-secondary transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:px-4 sm:text-sm"
            >
              Esci
            </button>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1180px] p-3 sm:p-5 lg:p-6">
          {mustChangePassword && (
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3" role="status">
              <p className="min-w-0 flex-1 basis-60 text-sm font-semibold text-amber-900">
                Stai usando la password predefinita. Devi cambiarla con una password personale.
              </p>
              <button
                type="button"
                onClick={() => setPasswordDialogOpen(true)}
                className="min-h-10 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-700"
              >
                Cambia ora
              </button>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
