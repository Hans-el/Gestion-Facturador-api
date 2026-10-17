import { Router } from "express";
import { authenticate, requirePermission } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import {
  createSaleSchema,
  previewSaleSchema,
  voidSaleSchema,
} from "./sales.schemas.js";
import * as controller from "./sales.controller.js";

export const salesRoutes = Router();

salesRoutes.use(authenticate);

salesRoutes.get("/", requirePermission("sales:view"), controller.list);
salesRoutes.get("/:id", requirePermission("sales:view"), controller.getById);
salesRoutes.post(
  "/preview",
  requirePermission("sales:create"),
  validateBody(previewSaleSchema),
  controller.preview,
);
salesRoutes.post(
  "/",
  requirePermission("sales:create"),
  validateBody(createSaleSchema),
  controller.create,
);
salesRoutes.post(
  "/:id/void",
  requirePermission("sales:delete"),
  validateBody(voidSaleSchema),
  controller.voidSale,
);
