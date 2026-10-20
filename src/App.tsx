import { useCallback, useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { HoursPage } from "./pages/HoursPage";
import { SummaryPage } from "./pages/SummaryPage";
import { getTimeEntries } from "./services/timeEntries";
import type { TimeEntry } from "../shared/timeEntry";

type Page = "hours" | "summary";

function currentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

export default function App() {
  const [page, setPage] = useState<Page>("hours");
  const [month, setMonth] = useState(currentMonth);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshEntries = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await getTimeEntries(month, signal);
      setEntries(result);
      setError("");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Impossibile caricare le ore.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    const controller = new AbortController();
    getTimeEntries(month, controller.signal)
      .then((result) => {
        setEntries(result);
        setError("");
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Impossibile caricare le ore.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month]);

  const handleEntrySaved = (entry: TimeEntry) => {
    if (entry.date.slice(0, 7) === month) {
      setEntries((current) => [entry, ...current]);
    } else {
      setLoading(true);
      void refreshEntries();
    }
  };

  return (
    <AppShell page={page} onPageChange={setPage}>
      {error && (
        <div
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
          role="alert"
        >
          {error}
          <button
            className="ml-3 font-bold underline underline-offset-2"
            onClick={() => {
              setLoading(true);
              void refreshEntries();
            }}
          >
            Riprova
          </button>
        </div>
      )}
      {page === "hours" ? (
        <HoursPage
          entries={entries}
          loading={loading}
          month={month}
          onEntrySaved={handleEntrySaved}
        />
      ) : (
        <SummaryPage
          entries={entries}
          loading={loading}
          month={month}
          onMonthChange={(value) => {
            setLoading(true);
            setMonth(value);
          }}
        />
      )}
    </AppShell>
  );
}
