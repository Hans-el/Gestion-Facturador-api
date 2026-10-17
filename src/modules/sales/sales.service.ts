import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { endOfDay, startOfDay } from "../../utils/date.js";
import { badRequest, conflict, notFound } from "../../utils/error.js";
import { getPagination, paginated } from "../../utils/pagination.js";
import { applyMovement } from "../inventory/inventory.service.js";
import { calculateSale } from "./sales.calculations.js";
import type {
  CreateSaleInput,
  ListSalesQuery,
  PreviewSaleInput,
} from "./sales.schemas.js";

const saleInclude = {
  items: { orderBy: { position: "asc" } },
  payments: { orderBy: { createdAt: "asc" } },
  user: { select: { id: true, name: true } },
  voidedBy: { select: { id: true, name: true } },
} satisfies Prisma.SaleInclude;

type SaleWithRelations = Prisma.SaleGetPayload<{ include: typeof saleInclude }>;

export const saleCode = (number: number) =>
  `VTA-${String(number).padStart(6, "0")}`;

const n = (d: Prisma.Decimal) => Number(d);

// ---------- Cálculo (vista previa y venta) ----------

async function buildDraft(
  db: Pick<Prisma.TransactionClient, "product">,
  input: PreviewSaleInput,
) {
  const products = await db.product.findMany({
    where: { id: { in: input.lines.map((l) => l.productId) } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = input.lines.map((line) => {
    const product = byId.get(line.productId);
    if (!product) throw notFound("Uno de los productos no existe");
    if (!product.isActive)
      throw badRequest(`"${product.name}" está dado de baja`);
    return { line, product };
  });

  const calc = calculateSale(
    lines.map(({ line, product }) => ({
      name: product.name,
      quantity: line.quantity,
      unitPrice: product.price,
      ivaRate: product.ivaRate,
      discount: line.discount,
    })),
    input.globalDiscount,
  );

  return { lines, ...calc };
}

type Draft = Awaited<ReturnType<typeof buildDraft>>;

function totalsDto(t: Draft["totals"]) {
  return {
    subtotal: n(t.subtotal),
    discountTotal: n(t.discountTotal),
    globalDiscountAmount: n(t.globalDiscountAmount),
    taxableBase: n(t.taxableBase),
    ivaTotal: n(t.ivaTotal),
    total: n(t.total),
    ivaBreakdown: t.ivaBreakdown.map((b) => ({
      ivaRate: b.ivaRate,
      ivaPercent: b.ivaPercent,
      taxableBase: n(b.taxableBase),
      ivaAmount: n(b.ivaAmount),
    })),
  };
}

export async function previewSale(input: PreviewSaleInput) {
  const draft = await buildDraft(prisma, input);

  return {
    lines: draft.lines.map(({ line, product }, i) => {
      const item = draft.items[i];
      return {
        productId: product.id,
        code: product.code,
        name: product.name,
        unit: product.unit,
        quantity: line.quantity,
        unitPrice: n(product.price),
        ivaRate: item.ivaRate,
        ivaPercent: n(item.ivaPercent),
        gross: n(item.gross),
        lineDiscount: n(item.lineDiscount),
        globalDiscountShare: n(item.globalDiscountShare),
        taxableBase: n(item.taxableBase),
        ivaAmount: n(item.ivaAmount),
        total: n(item.total),
        stock: n(product.stock),
        stockOk: product.stock.gte(line.quantity),
      };
    }),
    totals: totalsDto(draft.totals),
  };
}

// ---------- DTOs ----------

function toSaleDto(s: SaleWithRelations) {
  return {
    id: s.id,
    number: s.number,
    code: saleCode(s.number),
    status: s.status,
    createdAt: s.createdAt,
    customer: {
      id: s.customerId,
      idType: s.customerIdType,
      idNumber: s.customerIdNumber,
      name: s.customerName,
      email: s.customerEmail,
      phone: s.customerPhone,
      address: s.customerAddress,
    },
    seller: s.user,
    subtotal: n(s.subtotal),
    discountTotal: n(s.discountTotal),
    globalDiscountType: s.globalDiscountType,
    globalDiscountValue: s.globalDiscountValue
      ? n(s.globalDiscountValue)
      : null,
    taxableBase: n(s.taxableBase),
    ivaTotal: n(s.ivaTotal),
    total: n(s.total),
    notes: s.notes,
    voidedAt: s.voidedAt,
    voidReason: s.voidReason,
    voidedBy: s.voidedBy,
    items: s.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      code: i.productCode,
      name: i.productName,
      unit: i.unit,
      quantity: n(i.quantity),
      unitPrice: n(i.unitPrice),
      discountType: i.discountType,
      discountValue: i.discountValue ? n(i.discountValue) : null,
      lineDiscount: n(i.lineDiscount),
      globalDiscountShare: n(i.globalDiscountShare),
      taxableBase: n(i.taxableBase),
      ivaRate: i.ivaRate,
      ivaPercent: n(i.ivaPercent),
      ivaAmount: n(i.ivaAmount),
      total: n(i.total),
    })),
    payments: s.payments.map((p) => ({
      id: p.id,
      method: p.method,
      amount: n(p.amount),
      reference: p.reference,
    })),
  };
}

async function getSaleDetail(
  db: Pick<Prisma.TransactionClient, "sale">,
  id: string,
) {
  const sale = await db.sale.findUnique({
    where: { id },
    include: saleInclude,
  });
  if (!sale) throw notFound("Venta no encontrada");
  return toSaleDto(sale);
}

export const getSale = (id: string) => getSaleDetail(prisma, id);

// ---------- Crear ----------

export async function createSale(input: CreateSaleInput, userId: string) {
  return prisma.$transaction(
    async (tx) => {
      // 1. Cliente (sin cliente = Consumidor final)
      const customer = input.customerId
        ? await tx.customer.findUnique({ where: { id: input.customerId } })
        : await tx.customer.findFirst({
            where: { idType: "CONSUMIDOR_FINAL" },
          });
      if (!customer) {
        throw input.customerId
          ? notFound("Cliente no encontrado")
          : badRequest(
              'Falta el cliente "Consumidor final": ejecuta el seed (npm run db:seed)',
            );
      }
      if (!customer.isActive) throw badRequest("El cliente está dado de baja");

      // 2. Cálculo de líneas y totales con los precios actuales
      const draft = await buildDraft(tx, input);

      // 3. Los pagos deben cubrir exactamente el total
      const paid = input.payments.reduce(
        (acc, p) => acc.plus(p.amount),
        new Prisma.Decimal(0),
      );
      if (!paid.equals(draft.totals.total)) {
        throw badRequest(
          `Los pagos ($${paid.toFixed(2)}) no coinciden con el total ($${draft.totals.total.toFixed(2)})`,
        );
      }

      // 4. Guardar la venta con una copia de cliente, productos y precios
      const sale = await tx.sale.create({
        data: {
          customerId: customer.id,
          customerIdType: customer.idType,
          customerIdNumber: customer.idNumber,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          customerAddress: customer.address,
          userId,
          subtotal: draft.totals.subtotal,
          discountTotal: draft.totals.discountTotal,
          globalDiscountType: input.globalDiscount?.type ?? null,
          globalDiscountValue: input.globalDiscount?.value ?? null,
          taxableBase: draft.totals.taxableBase,
          ivaTotal: draft.totals.ivaTotal,
          total: draft.totals.total,
          notes: input.notes ?? null,
          items: {
            create: draft.lines.map(({ line, product }, i) => {
              const item = draft.items[i];
              return {
                position: i,
                productId: product.id,
                productCode: product.code,
                productName: product.name,
                unit: product.unit,
                quantity: line.quantity,
                unitPrice: product.price,
                discountType: line.discount?.type ?? null,
                discountValue: line.discount?.value ?? null,
                lineDiscount: item.lineDiscount,
                globalDiscountShare: item.globalDiscountShare,
                taxableBase: item.taxableBase,
                ivaRate: item.ivaRate,
                ivaPercent: item.ivaPercent,
                ivaAmount: item.ivaAmount,
                total: item.total,
              };
            }),
          },
          payments: {
            create: input.payments.map((p) => ({
              method: p.method,
              amount: p.amount,
              reference: p.reference ?? null,
            })),
          },
        },
        include: saleInclude,
      });

      // 5. Descontar stock. Ordenado por producto para evitar bloqueos cruzados entre ventas.
      const code = saleCode(sale.number);
      const ordered = [...draft.lines].sort((a, b) =>
        a.product.id.localeCompare(b.product.id),
      );
      for (const { line, product } of ordered) {
        await applyMovement(tx, {
          productId: product.id,
          type: "VENTA",
          delta: -line.quantity,
          reason: `Venta ${code}`,
          reference: code,
          userId,
        });
      }

      return toSaleDto(sale);
    },
    { maxWait: 5000, timeout: 20000 },
  );
}

// ---------- Anular ----------

export async function voidSale(id: string, reason: string, userId: string) {
  return prisma.$transaction(
    async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!sale) throw notFound("Venta no encontrada");

      // Cambio de estado atómico: si dos personas anulan a la vez, solo una lo logra
      const claimed = await tx.sale.updateMany({
        where: { id, status: "COMPLETED" },
        data: {
          status: "VOIDED",
          voidedAt: new Date(),
          voidReason: reason,
          voidedById: userId,
        },
      });
      if (claimed.count === 0) throw conflict("La venta ya está anulada");

      // Más adelante: si la venta tiene factura autorizada por el SRI, no se anula aquí
      // (corresponde una nota de crédito).

      const code = saleCode(sale.number);
      const ordered = [...sale.items].sort((a, b) =>
        a.productId.localeCompare(b.productId),
      );
      for (const item of ordered) {
        await applyMovement(tx, {
          productId: item.productId,
          type: "ANULACION",
          delta: item.quantity,
          reason: `Anulación de ${code}: ${reason}`,
          reference: code,
          userId,
          allowInactive: true,
        });
      }

      return getSaleDetail(tx, id);
    },
    { maxWait: 5000, timeout: 20000 },
  );
}

// ---------- Listado ----------

export async function listSales(query: ListSalesQuery) {
  const { page, limit, search, status, customerId, from, to } = query;

  const where: Prisma.SaleWhereInput = {
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
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
          OR: [
            { customerName: { contains: search, mode: "insensitive" } },
            { customerIdNumber: { contains: search, mode: "insensitive" } },
            ...(/^\d{1,9}$/.test(search) ? [{ number: Number(search) }] : []),
          ],
        }
      : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      include: {
        user: { select: { name: true } },
        payments: { select: { method: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...getPagination(page, limit),
    }),
  ]);

  return paginated(
    items.map((s) => ({
      id: s.id,
      number: s.number,
      code: saleCode(s.number),
      status: s.status,
      createdAt: s.createdAt,
      customerName: s.customerName,
      customerIdNumber: s.customerIdNumber,
      sellerName: s.user.name,
      total: n(s.total),
      paymentMethods: [...new Set(s.payments.map((p) => p.method))],
    })),
    total,
    page,
    limit,
  );
}
