import { z } from "zod";
import { validateIdentification } from "../../utils/ecuador-id.js";
import { paginationQuerySchema } from "../../utils/schemas.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+()\s-]{6,20}$/;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .refine((v) => v === "" || EMAIL.test(v), { message: "Correo inválido" })
  .transform((v) => v || null)
  .nullish();

const phone = z
  .string()
  .trim()
  .max(20)
  .refine((v) => v === "" || PHONE.test(v), { message: "Teléfono inválido" })
  .transform((v) => v || null)
  .nullish();

const address = z
  .string()
  .trim()
  .max(300)
  .transform((v) => v || null)
  .nullish();

export const customerSchema = z
  .object({
    idType: z.enum(["CEDULA", "RUC", "PASAPORTE", "EXTERIOR"]),
    idNumber: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, "La identificación es obligatoria")
      .max(20),
    name: z.string().trim().min(2, "Mínimo 2 caracteres").max(300),
    email,
    phone,
    address,
  })
  .superRefine((data, ctx) => {
    const error = validateIdentification(data.idType, data.idNumber);
    if (error)
      ctx.addIssue({ code: "custom", path: ["idNumber"], message: error });
  });

export const listCustomersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "all"]).default("active"),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
