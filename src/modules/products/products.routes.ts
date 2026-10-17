import { Router } from "express";
import { authenticate, requirePermission } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import {
  createProductSchema,
  updateProductSchema,
} from "./products.schemas.js";
import * as controller from "./products.controller.js";

export const productRoutes = Router();

productRoutes.use(authenticate);

productRoutes.get("/", requirePermission("products:view"), controller.list);
productRoutes.get(
  "/:id",
  requirePermission("products:view"),
  controller.getById,
);
productRoutes.post(
  "/",
  requirePermission("products:create"),
  validateBody(createProductSchema),
  controller.create,
);
productRoutes.patch(
  "/:id",
  requirePermission("products:edit"),
  validateBody(updateProductSchema),
  controller.update,
);
productRoutes.delete(
  "/:id",
  requirePermission("products:delete"),
  controller.deactivate,
);
