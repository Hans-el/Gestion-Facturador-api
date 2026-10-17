import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { AppError } from "../utils/error.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  res
    .status(404)
    .json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Errores controlados por nosotros
  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json({ message: err.message, details: err.details });
  }

  // Validación con zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Datos inválidos",
      details: err.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
  }

  // JSON mal formado en el body
  if (err instanceof SyntaxError && "body" in err) {
    return res
      .status(400)
      .json({ message: "El cuerpo de la solicitud no es un JSON válido" });
  }

  // Errores conocidos de Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        message: "Ya existe un registro con ese valor",
        details: err.meta,
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Registro no encontrado" });
    }
  }

  // Cualquier otra cosa: no filtramos detalles internos en producción
  console.error(err);
  res.status(500).json({
    message:
      env.NODE_ENV === "production"
        ? "Error interno del servidor"
        : String(err?.message ?? err),
  });
};
