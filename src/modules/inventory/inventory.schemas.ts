import { z } from "zod";
import { hasMaxDecimals, paginationQuerySchema } from "../../utils/schemas.js";

const productId = z.string().uuid("Producto inválido");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullish();

const requiredReason = z
  .string()
  .trim()
  .min(3, "Indica el motivo (mínimo 3 caracteres)")
  .max(200);

const decimals = { message: "Máximo 3 decimales" };

const quantity = z
  .number()
  .positive("La cantidad debe ser mayor a 0")
  .max(999_999_999)
  .refine(hasMaxDecimals(3), decimals);

const stockValue = z
  .number()
  .min(0)
  .max(999_999_999)
  .refine(hasMaxDecimals(3), decimals);

export const createMovementSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ENTRADA"),
    productId,
    quantity,
    reason: optionalText(200),
    reference: optionalText(100),
  }),
  z.object({
    type: z.literal("SALIDA"),
    productId,
    quantity,
    reason: requiredReason,
    reference: optionalText(100),
  }),
  z.object({
    type: z.literal("AJUSTE"),
    productId,
    newStock: stockValue,
    reason: requiredReason,
    reference: optionalText(100),
  }),
]);

// Fechas "AAAA-MM-DD"
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD)")
  .refine(
    (v) => !Number.isNaN(Date.parse(`${v}T00:00:00-05:00`)),
    "Fecha inválida",
  );

export const listMovementsQuerySchema = paginationQuerySchema.extend({
  productId: z.string().uuid().optional(),
  type: z
    .enum(["ENTRADA", "SALIDA", "AJUSTE", "VENTA", "ANULACION"])
    .optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  search: z.string().trim().optional(),
});

export type CreateMovementInput = z.infer<typeof createMovementSchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
