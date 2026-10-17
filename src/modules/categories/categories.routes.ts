import { Router } from "express";
import { authenticate, requirePermission } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "./categories.schemas.js";
import * as controller from "./categories.controller.js";

export const categoryRoutes = Router();

categoryRoutes.use(authenticate);

categoryRoutes.get("/", requirePermission("products:view"), controller.list);
categoryRoutes.get(
  "/:id",
  requirePermission("products:view"),
  controller.getById,
);
categoryRoutes.post(
  "/",
  requirePermission("products:create"),
  validateBody(createCategorySchema),
  controller.create,
);
categoryRoutes.patch(
  "/:id",
  requirePermission("products:edit"),
  validateBody(updateCategorySchema),
  controller.update,
);
categoryRoutes.delete(
  "/:id",
  requirePermission("products:delete"),
  controller.deactivate,
);
