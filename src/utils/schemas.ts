import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().uuid("ID inválido"),
});

// Para query strings: ?lowStock=true  →  true  (si no viene, false)
export const booleanFlag = z
  .enum(["true", "false"])
  .optional()
  .transform((v) => v === "true");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Acepta números con hasta `decimals` decimales (rechaza 2.12345 y notaciones como 1e-7)
export const hasMaxDecimals = (decimals: number) => (value: number) =>
  new RegExp(`^-?\\d+(\\.\\d{1,${decimals}})?$`).test(String(value));
