import type { RequestHandler } from "express";
import { idParamSchema } from "../../utils/schemas.js";
import { listCategoriesQuerySchema } from "./categories.schemas.js";
import * as categoryService from "./categories.service.js";

export const list: RequestHandler = async (req, res) => {
  const query = listCategoriesQuerySchema.parse(req.query);
  res.json(await categoryService.list(query));
};

export const getById: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await categoryService.getById(id));
};

export const create: RequestHandler = async (req, res) => {
  res.status(201).json(await categoryService.create(req.body));
};

export const update: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await categoryService.update(id, req.body));
};

export const deactivate: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await categoryService.deactivate(id));
};
