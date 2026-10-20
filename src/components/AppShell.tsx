import { useState } from "react";
import { Icon } from "./Icon";

type Page = "hours" | "summary";

const navigation: { id: Page; label: string; icon: "clock" | "calendar" }[] = [
  { id: "hours", label: "Inserisci ore", icon: "clock" },
  { id: "summary", label: "Riepilogo mensile", icon: "calendar" },
];

export function AppShell({
  page,
  onPageChange,
  children,
}: {
  page: Page;
  onPageChange: (page: Page) => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <span className="grid size-11 place-items-center rounded-xl bg-primary text-xl font-extrabold text-white">
            O
          </span>
          <span>
            <span className="block text-lg font-extrabold leading-tight text-white">
              Ocima Ore
            </span>
            <span className="text-xs font-medium text-sidebar-muted">
              Registro attività
            </span>
          </span>
        </div>

        <div className="mb-3 mt-10 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-sidebar-muted">
          Il tuo spazio
        </div>
        <nav className="flex flex-col gap-1.5" aria-label="Navigazione principale">
          {navigation.map((item) => (
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

        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary-soft">
              OC
            </span>
            <div>
              <div className="text-sm font-bold text-white">Area personale</div>
              <div className="text-xs text-sidebar-muted">Gestione ore</div>
            </div>
          </div>
        </div>
      </aside>

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
              Ocima <span className="mx-1 text-border-strong">/</span>{" "}
              {page === "hours" ? "Inserisci ore" : "Riepilogo mensile"}
            </div>
            <div className="text-sm font-bold text-ink sm:hidden">Ocima Ore</div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary-tint px-3 py-1.5 text-xs font-bold text-primary-dark">
            <span className="size-2 rounded-full bg-primary" />
            Registro ore
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1440px] p-4 sm:p-7 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
