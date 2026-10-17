import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { conflict, notFound } from "../../utils/error.js";
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from "./categories.schemas.js";

// Evita duplicados que solo difieren en mayúsculas ("Codos" vs "codos")
async function assertNameFree(name: string, excludeId?: string) {
  const exists = await prisma.category.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (exists) throw conflict(`Ya existe una categoría llamada "${name}"`);
}

export async function list({ search, includeInactive }: ListCategoriesQuery) {
  const where: Prisma.CategoryWhereInput = {
    ...(includeInactive ? {} : { isActive: true }),
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
  };

  const categories = await prisma.category.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });

  return {
    data: categories.map(({ _count, ...c }) => ({
      ...c,
      productCount: _count.products,
    })),
  };
}

export async function getById(id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw notFound("Categoría no encontrada");
  return category;
}

export async function create(input: CreateCategoryInput) {
  await assertNameFree(input.name);
  return prisma.category.create({ data: input });
}

export async function update(id: string, input: UpdateCategoryInput) {
  await getById(id);
  if (input.name) await assertNameFree(input.name, id);
  return prisma.category.update({ where: { id }, data: input });
}

// Baja lógica. No se permite si aún tiene productos activos.
export async function deactivate(id: string) {
  await getById(id);

  const activeProducts = await prisma.product.count({
    where: { categoryId: id, isActive: true },
  });
  if (activeProducts > 0) {
    throw conflict(
      `No se puede dar de baja: la categoría tiene ${activeProducts} producto(s) activo(s)`,
    );
  }

  return prisma.category.update({ where: { id }, data: { isActive: false } });
}
