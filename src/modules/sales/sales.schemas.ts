import { z } from "zod";
import {
  dateOnly,
  hasMaxDecimals,
  paginationQuerySchema,
} from "../../utils/schemas.js";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullish();

const discountSchema = z
  .object({
    type: z.enum(["PERCENT", "AMOUNT"]),
    value: z
      .number()
      .positive("El descuento debe ser mayor a 0")
      .max(9_999_999_999.99)
      .refine(hasMaxDecimals(2), { message: "Máximo 2 decimales" }),
  })
  .superRefine((d, ctx) => {
    if (d.type === "PERCENT" && d.value > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "El porcentaje no puede superar 100",
      });
    }
  });

const lineSchema = z.object({
  productId: z.string().uuid("Producto inválido"),
  quantity: z
    .number()
    .positive("La cantidad debe ser mayor a 0")
    .max(999_999_999)
    .refine(hasMaxDecimals(3), { message: "Máximo 3 decimales" }),
  discount: discountSchema.nullish(),
});

const paymentSchema = z.object({
  method: z.enum([
    "EFECTIVO",
    "TRANSFERENCIA",
    "TARJETA_DEBITO",
    "TARJETA_CREDITO",
  ]),
  amount: z
    .number()
    .positive("El valor debe ser mayor a 0")
    .max(9_999_999_999.99)
    .refine(hasMaxDecimals(2), { message: "Máximo 2 decimales" }),
  reference: optionalText(100),
});

const draftShape = {
  lines: z.array(lineSchema).min(1, "Agrega al menos un producto").max(100),
  globalDiscount: discountSchema.nullish(),
};

// Índices de las líneas cuyo producto ya apareció antes
function duplicateIndexes(lines: { productId: string }[]) {
  const seen = new Set<string>();
  const duplicated: number[] = [];
  lines.forEach((line, i) => {
    if (seen.has(line.productId)) duplicated.push(i);
    seen.add(line.productId);
  });
  return duplicated;
}

const DUPLICATE_MESSAGE =
  "Producto repetido: junta las cantidades en una sola línea";

// Cálculo sin guardar (para mostrar totales en pantalla)
export const previewSaleSchema = z
  .object(draftShape)
  .superRefine((data, ctx) => {
    for (const i of duplicateIndexes(data.lines)) {
      ctx.addIssue({
        code: "custom",
        path: ["lines", i, "productId"],
        message: DUPLICATE_MESSAGE,
      });
    }
  });

export const createSaleSchema = z
  .object({
    ...draftShape,
    customerId: z.string().uuid("Cliente inválido").nullish(), // sin cliente = Consumidor final
    payments: z
      .array(paymentSchema)
      .min(1, "Indica al menos una forma de pago")
      .max(10),
    notes: optionalText(300),
  })
  .superRefine((data, ctx) => {
    for (const i of duplicateIndexes(data.lines)) {
      ctx.addIssue({
        code: "custom",
        path: ["lines", i, "productId"],
        message: DUPLICATE_MESSAGE,
      });
    }
  });

export const voidSaleSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Indica el motivo (mínimo 3 caracteres)")
    .max(200),
});

export const listSalesQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(["COMPLETED", "VOIDED"]).optional(),
  customerId: z.string().uuid().optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
});

export type PreviewSaleInput = z.infer<typeof previewSaleSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;
