import { Router } from "express";
import { activityCatalog } from "../activities.js";

export function createActivitiesRouter(): Router {
  const router = Router();
  router.get("/", (_request, response) => {
    response.json(activityCatalog);
  });
  return router;
}
