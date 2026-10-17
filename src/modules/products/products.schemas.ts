import { z } from "zod";
import {
  booleanFlag,
  hasMaxDecimals,
  paginationQuerySchema,
} from "../../utils/schemas.js";

const IVA_RATES = [
  "IVA_0",
  "IVA_5",
  "IVA_12",
  "IVA_13",
  "IVA_14",
  "IVA_15",
  "NO_OBJETO",
  "EXENTO",
] as const;

// Dinero: máximo 2 decimales y dentro del rango de Decimal(12,2)
const money = z
  .number()
  .min(0)
  .max(9_999_999_999.99)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, {
    message: "Máximo 2 decimales",
  });

const f = {
  code: z
    .string()
    .trim()
    .min(1, "El código es obligatorio")
    .max(50)
    .transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(200),
  description: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => v || null)
    .nullish(),
  categoryId: z.string().uuid("Categoría inválida"),
  unit: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .transform((v) => v.toUpperCase()),
  price: money.refine((v) => v > 0, {
    message: "El precio debe ser mayor a 0",
  }),
  cost: money,
  ivaRate: z.enum(IVA_RATES),
  minStock: z
    .number()
    .min(0)
    .max(999_999_999)
    .refine(hasMaxDecimals(3), { message: "Máximo 3 decimales" }),
};

export const createProductSchema = z.object({
  code: f.code,
  name: f.name,
  description: f.description,
  categoryId: f.categoryId,
  unit: f.unit.default("UNIDAD"),
  price: f.price,
  cost: f.cost.default(0),
  ivaRate: f.ivaRate.default("IVA_15"),
  minStock: f.minStock.default(0),
});

// Nota: el stock NO se edita aquí (ver notas al final)
export const updateProductSchema = z
  .object({
    code: f.code.optional(),
    name: f.name.optional(),
    description: f.description,
    categoryId: f.categoryId.optional(),
    unit: f.unit.optional(),
    price: f.price.optional(),
    cost: f.cost.optional(),
    ivaRate: f.ivaRate.optional(),
    minStock: f.minStock.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((o) => Object.values(o).some((v) => v !== undefined), {
    message: "Envía al menos un campo para actualizar",
  });

export const listProductsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  lowStock: booleanFlag,
  status: z.enum(["active", "inactive", "all"]).default("active"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
