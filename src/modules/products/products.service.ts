import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { badRequest, conflict, notFound } from "../../utils/error.js";
import { getPagination, paginated } from "../../utils/pagination.js";
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from "./products.schemas.js";

const include = {
  category: { select: { id: true, name: true } },
} satisfies Prisma.ProductInclude;

type ProductWithCategory = Prisma.ProductGetPayload<{
  include: typeof include;
}>;

function toDto(p: ProductWithCategory) {
  return {
    ...p,
    price: Number(p.price),
    cost: Number(p.cost),
    stock: Number(p.stock),
    minStock: Number(p.minStock),
  };
}

async function assertCodeFree(code: string) {
  const exists = await prisma.product.findUnique({
    where: { code },
    select: { id: true },
  });
  if (exists) {
    throw conflict(
      `Ya existe un producto con el código ${code} (puede estar dado de baja)`,
    );
  }
}

async function assertCategoryUsable(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!category || !category.isActive) {
    throw badRequest("La categoría no existe o está dada de baja");
  }
}

export async function list(query: ListProductsQuery) {
  const { page, limit, search, categoryId, lowStock, status } = query;

  const where: Prisma.ProductWhereInput = {
    ...(status === "all" ? {} : { isActive: status === "active" }),
    ...(categoryId ? { categoryId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(lowStock ? { stock: { lte: prisma.product.fields.minStock } } : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include,
      orderBy: { name: "asc" },
      ...getPagination(page, limit),
    }),
  ]);

  return paginated(items.map(toDto), total, page, limit);
}

export async function getById(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, include });
  if (!product) throw notFound("Producto no encontrado");
  return toDto(product);
}

export async function create(input: CreateProductInput) {
  await assertCodeFree(input.code);
  await assertCategoryUsable(input.categoryId);
  const product = await prisma.product.create({ data: input, include });
  return toDto(product);
}

export async function update(id: string, input: UpdateProductInput) {
  const current = await prisma.product.findUnique({ where: { id } });
  if (!current) throw notFound("Producto no encontrado");

  if (input.code && input.code !== current.code)
    await assertCodeFree(input.code);
  if (input.categoryId && input.categoryId !== current.categoryId) {
    await assertCategoryUsable(input.categoryId);
  }

  const product = await prisma.product.update({
    where: { id },
    data: input,
    include,
  });
  return toDto(product);
}

// Baja lógica
export async function deactivate(id: string) {
  const current = await prisma.product.findUnique({ where: { id } });
  if (!current) throw notFound("Producto no encontrado");

  const product = await prisma.product.update({
    where: { id },
    data: { isActive: false },
    include,
  });
  return toDto(product);
}
