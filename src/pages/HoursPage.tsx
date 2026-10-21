import { HoursEntryForm } from "../components/HoursEntryForm";
import type { TimeEntry } from "../../shared/timeEntry";

export function HoursPage({
  onEntrySaved,
}: {
  onEntrySaved: (entry: TimeEntry) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl">
        <HoursEntryForm onSaved={onEntrySaved} />
    </div>
  );
}
