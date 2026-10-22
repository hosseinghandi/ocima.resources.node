import type { DepartmentActivities } from "../shared/activities.js";
import activitySeed from "./seeds/activity.json" with { type: "json" };

export const activityCatalog: DepartmentActivities[] = activitySeed;

export function activitiesForDepartment(reparto: string): string[] | undefined {
  return activityCatalog.find((item) => item.reparto === reparto)?.attivita;
}
