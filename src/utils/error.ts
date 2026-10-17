export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const badRequest = (msg = "Solicitud inválida", details?: unknown) =>
  new AppError(400, msg, details);
export const unauthorized = (msg = "No autenticado") => new AppError(401, msg);
export const forbidden = (msg = "No tienes permiso para esta acción") =>
  new AppError(403, msg);
export const notFound = (msg = "Recurso no encontrado") =>
  new AppError(404, msg);
export const conflict = (msg = "El recurso ya existe") =>
  new AppError(409, msg);
