import type { RequestHandler } from "express";
import { idParamSchema } from "../../utils/schemas.js";
import { listProductsQuerySchema } from "./products.schemas.js";
import * as productService from "./products.service.js";

export const list: RequestHandler = async (req, res) => {
  const query = listProductsQuerySchema.parse(req.query);
  res.json(await productService.list(query));
};

export const getById: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await productService.getById(id));
};

export const create: RequestHandler = async (req, res) => {
  res.status(201).json(await productService.create(req.body));
};

export const update: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await productService.update(id, req.body));
};

export const deactivate: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await productService.deactivate(id));
};
