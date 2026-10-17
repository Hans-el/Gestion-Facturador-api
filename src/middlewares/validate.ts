import type { RequestHandler } from "express";
import type { ZodType } from "zod";

// Valida (y limpia) el body. Si falla, zod lanza y el errorHandler responde 400.
export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
