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

// Fecha "AAAA-MM-DD"
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD)")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00-05:00`)), {
    message: "Fecha inválida",
  });
