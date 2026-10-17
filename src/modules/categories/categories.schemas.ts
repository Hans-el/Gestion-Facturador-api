import { z } from "zod";
import { booleanFlag } from "../../utils/schemas.js";

const name = z.string().trim().min(2, "Mínimo 2 caracteres").max(100);
const description = z
  .string()
  .trim()
  .max(500)
  .transform((v) => v || null)
  .nullish();

export const createCategorySchema = z.object({ name, description });

export const updateCategorySchema = z
  .object({
    name: name.optional(),
    description,
    isActive: z.boolean().optional(),
  })
  .refine((o) => Object.values(o).some((v) => v !== undefined), {
    message: "Envía al menos un campo para actualizar",
  });

export const listCategoriesQuerySchema = z.object({
  search: z.string().trim().optional(),
  includeInactive: booleanFlag,
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
