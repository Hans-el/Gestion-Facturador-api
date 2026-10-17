import { Router } from "express";
import { authenticate, requirePermission } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { createMovementSchema } from "./inventory.schemas.js";
import * as controller from "./inventory.controller.js";

export const inventoryRoutes = Router();

inventoryRoutes.use(authenticate);

inventoryRoutes.get(
  "/summary",
  requirePermission("inventory:view"),
  controller.getSummary,
);
inventoryRoutes.get(
  "/movements",
  requirePermission("inventory:view"),
  controller.listMovements,
);
inventoryRoutes.post(
  "/movements",
  requirePermission("inventory:create"),
  validateBody(createMovementSchema),
  controller.createMovement,
);
