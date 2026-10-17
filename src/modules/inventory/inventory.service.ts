import { Prisma, type MovementType } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { badRequest, conflict, notFound } from "../../utils/error.js";
import { getPagination, paginated } from "../../utils/pagination.js";
import type {
  CreateMovementInput,
  ListMovementsQuery,
} from "./inventory.schemas.js";

const movementInclude = {
  product: { select: { id: true, code: true, name: true } },
  user: { select: { id: true, name: true } },
} satisfies Prisma.StockMovementInclude;

type MovementWithRelations = Prisma.StockMovementGetPayload<{
  include: typeof movementInclude;
}>;

// Los Decimal se envían al frontend como número
function toMovementDto(m: MovementWithRelations) {
  return {
    ...m,
    quantity: Number(m.quantity),
    stockBefore: Number(m.stockBefore),
    stockAfter: Number(m.stockAfter),
  };
}

type Amount = number | string | Prisma.Decimal;

interface ApplyMovementInput {
  productId: string;
  type: MovementType;
  delta?: Amount; // cambio relativo: + entra, - sale
  setTo?: Amount; // stock final absoluto (ajustes)
  reason?: string | null;
  reference?: string | null;
  userId: string;
}

// Debe ejecutarse dentro de una transacción (tx)
export async function applyMovement(
  tx: Prisma.TransactionClient,
  input: ApplyMovementInput,
) {
  // Bloquea la fila hasta que termine la transacción. El stock se lee como texto
  // para operar con Decimal exacto y no con números de coma flotante.
  const rows = await tx.$queryRaw<
    { stock: string; isActive: boolean; name: string }[]
  >`
    SELECT "stock"::text AS "stock", "isActive", "name"
    FROM "Product"
    WHERE "id" = ${input.productId}
    FOR UPDATE`;

  const product = rows[0];
  if (!product) throw notFound("Producto no encontrado");
  if (!product.isActive)
    throw badRequest(`"${product.name}" está dado de baja`);

  const stockBefore = new Prisma.Decimal(product.stock);
  const stockAfter =
    input.setTo !== undefined
      ? new Prisma.Decimal(input.setTo)
      : stockBefore.plus(input.delta ?? 0);
  const quantity = stockAfter.minus(stockBefore);

  if (quantity.isZero())
    throw badRequest("El movimiento no cambia el stock actual");
  if (stockAfter.isNegative()) {
    throw conflict(
      `Stock insuficiente para "${product.name}" (disponible: ${stockBefore.toString()})`,
    );
  }

  await tx.product.update({
    where: { id: input.productId },
    data: { stock: stockAfter },
  });

  const movement = await tx.stockMovement.create({
    data: {
      productId: input.productId,
      type: input.type,
      quantity,
      stockBefore,
      stockAfter,
      reason: input.reason ?? null,
      reference: input.reference ?? null,
      userId: input.userId,
    },
    include: movementInclude,
  });

  return toMovementDto(movement);
}

export function createMovement(input: CreateMovementInput, userId: string) {
  return prisma.$transaction((tx) => {
    const base = {
      productId: input.productId,
      type: input.type,
      reason: input.reason,
      reference: input.reference,
      userId,
    };

    switch (input.type) {
      case "ENTRADA":
        return applyMovement(tx, { ...base, delta: input.quantity });
      case "SALIDA":
        return applyMovement(tx, { ...base, delta: -input.quantity });
      case "AJUSTE":
        return applyMovement(tx, { ...base, setTo: input.newStock });
    }
  });
}

// Ecuador continental no usa horario de verano: -05:00 todo el año
const startOfDay = (d: string) => new Date(`${d}T00:00:00.000-05:00`);
const endOfDay = (d: string) => new Date(`${d}T23:59:59.999-05:00`);

export async function listMovements(query: ListMovementsQuery) {
  const { page, limit, productId, type, from, to, search } = query;

  const where: Prisma.StockMovementWhereInput = {
    ...(productId ? { productId } : {}),
    ...(type ? { type } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: startOfDay(from) } : {}),
            ...(to ? { lte: endOfDay(to) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          product: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      include: movementInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...getPagination(page, limit),
    }),
  ]);

  return paginated(items.map(toMovementDto), total, page, limit);
}

// Cifras para las tarjetas de la pantalla de inventario (solo productos activos)
export async function getSummary() {
  const [row] = await prisma.$queryRaw<
    {
      totalProducts: number;
      totalUnits: number;
      costValue: number;
      saleValue: number;
      lowStockCount: number;
      outOfStockCount: number;
    }[]
  >`
    SELECT
      COUNT(*)::int AS "totalProducts",
      ROUND(COALESCE(SUM("stock"), 0), 3)::float8 AS "totalUnits",
      ROUND(COALESCE(SUM("stock" * "cost"), 0), 2)::float8 AS "costValue",
      ROUND(COALESCE(SUM("stock" * "price"), 0), 2)::float8 AS "saleValue",
      COUNT(*) FILTER (WHERE "stock" <= "minStock")::int AS "lowStockCount",
      COUNT(*) FILTER (WHERE "stock" = 0)::int AS "outOfStockCount"
    FROM "Product"
    WHERE "isActive" = true`;

  return row;
}
