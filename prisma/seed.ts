import bcrypt from "bcrypt";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";

const CATEGORIES = [
  {
    name: "Tuberías",
    description: "Tubos de PVC de distintos diámetros y presiones",
  },
  { name: "Accesorios", description: "Accesorios para instalaciones de PVC" },
  { name: "Uniones", description: "Uniones, neplos y reducciones" },
  { name: "Codos", description: "Codos de 45° y 90°" },
  { name: "Pegamentos", description: "Pegamentos y limpiadores para PVC" },
  { name: "Otros", description: "Productos que no encajan en otra categoría" },
];

async function main() {
  const { ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD } = env;

  if (!ADMIN_EMAIL || !ADMIN_NAME || !ADMIN_PASSWORD) {
    throw new Error(
      "Define ADMIN_EMAIL, ADMIN_NAME y ADMIN_PASSWORD en el .env",
    );
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL.toLowerCase() },
    update: {}, // si ya existe, no se toca
    create: {
      email: ADMIN_EMAIL.toLowerCase(),
      name: ADMIN_NAME,
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`Administrador: ${admin.email}`);

  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }
  console.log(`Categorías: ${CATEGORIES.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
