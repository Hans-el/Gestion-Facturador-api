import "dotenv/config";
import { z } from "zod";

// Eso lo que hace es validar las variables al arrancar. Si falta alguna, el servidor se detiene con un mensaje claro.
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // Solo los usa el seed
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_NAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variables de entorno inválidas:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
