import { HoursEntryForm } from "../components/HoursEntryForm";
import type { CreateTimeEntryInput, TimeEntry } from "../../shared/timeEntry";
import type { Employee } from "../../shared/people";

export function HoursPage({
  employee,
  onSave,
}: {
  employee: Employee;
  onSave: (input: CreateTimeEntryInput) => Promise<TimeEntry>;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl">
        <HoursEntryForm employee={employee} onSave={onSave} />
    </div>
  );
}
