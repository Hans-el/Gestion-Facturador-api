import { Router } from "express";
import { authenticate, requirePermission } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { customerSchema } from "./customers.schemas.js";
import * as controller from "./customers.controller.js";

export const customerRoutes = Router();

customerRoutes.use(authenticate);

customerRoutes.get("/", requirePermission("customers:view"), controller.list);
customerRoutes.get(
  "/:id",
  requirePermission("customers:view"),
  controller.getById,
);
customerRoutes.post(
  "/",
  requirePermission("customers:create"),
  validateBody(customerSchema),
  controller.create,
);
customerRoutes.put(
  "/:id",
  requirePermission("customers:edit"),
  validateBody(customerSchema),
  controller.update,
);
customerRoutes.delete(
  "/:id",
  requirePermission("customers:delete"),
  controller.deactivate,
);
customerRoutes.post(
  "/:id/reactivate",
  requirePermission("customers:edit"),
  controller.reactivate,
);
