import { HoursEntryForm } from "../components/HoursEntryForm";
import type { CreateTimeEntryInput, TimeEntry } from "../../backend/contracts/timeEntry";
import type { Employee } from "../../backend/contracts/people";

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
