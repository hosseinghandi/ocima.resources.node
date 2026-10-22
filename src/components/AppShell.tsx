import { useState } from "react";
import { Icon } from "./Icon";
import { ChangePasswordDialog, ForgotPasswordDialog } from "./PasswordDialogs";
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
    ],
  },
];

const employeeNavigation: NavGroup[] = [
  {
    title: "Il tuo spazio",
    items: [
      { id: "hours", label: "Inserisci ore", icon: "clock" },
      { id: "summary", label: "Riepilogo", icon: "calendar" },
    ],
  },
];

export function AppShell({
  page,
  role,
  userId,
  userName,
  onPageChange,
  onSignOut,
  children,
}: {
  page: Page;
  role: UserRole;
  userId: number;
  userName: string;
  onPageChange: (page: Page) => void;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState<"change" | "forgot" | null>(null);
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

        <div className="mt-8 flex flex-col gap-6 overflow-y-auto">
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
          <div className="mt-3 grid gap-1 border-t border-white/10 pt-2">
            <button
              type="button"
              onClick={() => setPasswordDialog("change")}
              className="min-h-9 rounded-md px-2 text-left text-xs font-semibold text-sidebar-muted transition hover:bg-white/8 hover:text-white"
            >
              Cambia password
            </button>
            <button
              type="button"
              onClick={() => setPasswordDialog("forgot")}
              className="min-h-9 rounded-md px-2 text-left text-xs font-semibold text-sidebar-muted transition hover:bg-white/8 hover:text-white"
            >
              Password dimenticata
            </button>
          </div>
        </div>
      </aside>

      {passwordDialog === "change" && (
        <ChangePasswordDialog role={role} id={userId} name={userName} onClose={() => setPasswordDialog(null)} />
      )}
      {passwordDialog === "forgot" && (
        <ForgotPasswordDialog role={role} id={userId} name={userName} onClose={() => setPasswordDialog(null)} />
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
        <div className="mx-auto w-full max-w-[1440px] p-4 sm:p-7 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
