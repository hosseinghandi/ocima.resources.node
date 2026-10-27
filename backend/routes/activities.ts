import { Router } from "express";
import type { DepartmentActivities } from "../contracts/activities.js";
import activitySeed from "../db/seeds/activity.json" with { type: "json" };

const activityCatalog: DepartmentActivities[] = activitySeed;

export function activitiesForDepartment(reparto: string): string[] | undefined {
  return activityCatalog.find((item) => item.reparto === reparto)?.attivita;
}

export function createActivitiesRouter(): Router {
  const router = Router();
  router.get("/", (_request, response) => {
    response.json(activityCatalog);
  });
  return router;
}
