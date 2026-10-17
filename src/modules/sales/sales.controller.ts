import type { RequestHandler } from "express";
import { unauthorized } from "../../utils/error.js";
import { idParamSchema } from "../../utils/schemas.js";
import { listSalesQuerySchema } from "./sales.schemas.js";
import * as salesService from "./sales.service.js";

export const list: RequestHandler = async (req, res) => {
  const query = listSalesQuerySchema.parse(req.query);
  res.json(await salesService.listSales(query));
};

export const getById: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await salesService.getSale(id));
};

export const preview: RequestHandler = async (req, res) => {
  res.json(await salesService.previewSale(req.body));
};

export const create: RequestHandler = async (req, res) => {
  if (!req.user) throw unauthorized();
  res.status(201).json(await salesService.createSale(req.body, req.user.id));
};

export const voidSale: RequestHandler = async (req, res) => {
  if (!req.user) throw unauthorized();
  const { id } = idParamSchema.parse(req.params);
  res.json(await salesService.voidSale(id, req.body.reason, req.user.id));
};
