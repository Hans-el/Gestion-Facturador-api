import type { RequestHandler } from "express";
import { idParamSchema } from "../../utils/schemas.js";
import { listCustomersQuerySchema } from "./customers.schemas.js";
import * as customerService from "./customers.service.js";

export const list: RequestHandler = async (req, res) => {
  const query = listCustomersQuerySchema.parse(req.query);
  res.json(await customerService.list(query));
};

export const getById: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await customerService.getById(id));
};

export const create: RequestHandler = async (req, res) => {
  res.status(201).json(await customerService.create(req.body));
};

export const update: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await customerService.update(id, req.body));
};

export const deactivate: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await customerService.deactivate(id));
};

export const reactivate: RequestHandler = async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await customerService.reactivate(id));
};
