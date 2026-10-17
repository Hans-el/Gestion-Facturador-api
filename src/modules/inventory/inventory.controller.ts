import type { RequestHandler } from "express";
import { forbidden, unauthorized } from "../../utils/error.js";
import { listMovementsQuerySchema } from "./inventory.schemas.js";
import * as inventoryService from "./inventory.service.js";

export const listMovements: RequestHandler = async (req, res) => {
  const query = listMovementsQuerySchema.parse(req.query);
  res.json(await inventoryService.listMovements(query));
};

export const getSummary: RequestHandler = async (_req, res) => {
  res.json(await inventoryService.getSummary());
};

export const createMovement: RequestHandler = async (req, res) => {
  const user = req.user;
  if (!user) throw unauthorized();

  if (
    req.body.type === "AJUSTE" &&
    !user.permissions.includes("inventory:edit")
  ) {
    throw forbidden("Los ajustes de inventario requieren permiso de edición");
  }

  res
    .status(201)
    .json(await inventoryService.createMovement(req.body, user.id));
};
