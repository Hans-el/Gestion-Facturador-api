import { PrismaPg } from "@prisma/adapter-pg";
// import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaClient } from "@prisma/client"; //USAR ESTE EN VEZ DEL DE ARRIBA
import { env } from "./env.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
