import { Prisma, type IvaRate } from "@prisma/client";
import { badRequest } from "../../utils/error.js";

export const IVA_PERCENT: Record<IvaRate, number> = {
  IVA_0: 0,
  IVA_5: 5,
  IVA_12: 12,
  IVA_13: 13,
  IVA_14: 14,
  IVA_15: 15,
  NO_OBJETO: 0,
  EXENTO: 0,
};

export interface DiscountInput {
  type: "PERCENT" | "AMOUNT";
  value: number;
}

export interface CalcLineInput {
  name: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  ivaRate: IvaRate;
  discount?: DiscountInput | null;
}

type Amount = number | string | Prisma.Decimal;

const D = (value: Amount) => new Prisma.Decimal(value);
const ZERO = D(0);
const CENT = D("0.01");

export const round2 = (d: Prisma.Decimal) =>
  d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
const sum = (values: Prisma.Decimal[]) =>
  values.reduce((acc, v) => acc.plus(v), ZERO);

export function calculateSale(
  lines: CalcLineInput[],
  globalDiscount?: DiscountInput | null,
) {
  // 1. Valor de cada línea y su descuento propio
  const base = lines.map((line) => {
    const gross = round2(line.unitPrice.mul(line.quantity));

    let lineDiscount = ZERO;
    if (line.discount) {
      lineDiscount =
        line.discount.type === "PERCENT"
          ? round2(gross.mul(line.discount.value).div(100))
          : D(line.discount.value);
    }
    if (lineDiscount.gt(gross)) {
      throw badRequest(
        `El descuento de "${line.name}" supera el valor de la línea`,
      );
    }

    return { gross, lineDiscount, net: gross.minus(lineDiscount) };
  });

  // 2. Descuento general y su reparto proporcional entre las líneas
  const netTotal = sum(base.map((b) => b.net));

  let globalAmount = ZERO;
  if (globalDiscount) {
    globalAmount =
      globalDiscount.type === "PERCENT"
        ? round2(netTotal.mul(globalDiscount.value).div(100))
        : D(globalDiscount.value);
    if (globalAmount.gt(netTotal))
      throw badRequest("El descuento general supera el total de la venta");
  }

  const shares = base.map((b) =>
    netTotal.isZero() ? ZERO : round2(globalAmount.mul(b.net).div(netTotal)),
  );

  // Ajuste de centavos por redondeo: se reparte entre las líneas de mayor valor
  const order = base
    .map((_, i) => i)
    .sort((a, b) => base[b].net.comparedTo(base[a].net));
  let remainder = globalAmount.minus(sum(shares));
  while (!remainder.isZero()) {
    let moved = false;
    for (const i of order) {
      if (remainder.isZero()) break;
      const step = remainder.isPositive() ? CENT : CENT.neg();
      const next = shares[i].plus(step);
      if (next.gte(0) && next.lte(base[i].net)) {
        shares[i] = next;
        remainder = remainder.minus(step);
        moved = true;
      }
    }
    if (!moved)
      throw badRequest(
        "No se pudo repartir el descuento general entre las líneas",
      );
  }

  // 3. Base imponible e IVA por línea
  const items = lines.map((line, i) => {
    const { gross, lineDiscount, net } = base[i];
    const taxableBase = net.minus(shares[i]);
    const ivaPercent = IVA_PERCENT[line.ivaRate];
    const ivaAmount = round2(taxableBase.mul(ivaPercent).div(100));

    return {
      gross,
      lineDiscount,
      globalDiscountShare: shares[i],
      taxableBase,
      ivaRate: line.ivaRate,
      ivaPercent: D(ivaPercent),
      ivaAmount,
      total: taxableBase.plus(ivaAmount),
    };
  });

  // 4. Totales y desglose por tarifa de IVA
  const breakdown = new Map<
    IvaRate,
    {
      ivaRate: IvaRate;
      ivaPercent: number;
      taxableBase: Prisma.Decimal;
      ivaAmount: Prisma.Decimal;
    }
  >();
  for (const item of items) {
    const current = breakdown.get(item.ivaRate) ?? {
      ivaRate: item.ivaRate,
      ivaPercent: IVA_PERCENT[item.ivaRate],
      taxableBase: ZERO,
      ivaAmount: ZERO,
    };
    current.taxableBase = current.taxableBase.plus(item.taxableBase);
    current.ivaAmount = current.ivaAmount.plus(item.ivaAmount);
    breakdown.set(item.ivaRate, current);
  }

  const totals = {
    subtotal: sum(items.map((i) => i.gross)),
    discountTotal: sum(
      items.map((i) => i.lineDiscount.plus(i.globalDiscountShare)),
    ),
    globalDiscountAmount: globalAmount,
    taxableBase: sum(items.map((i) => i.taxableBase)),
    ivaTotal: sum(items.map((i) => i.ivaAmount)),
    total: sum(items.map((i) => i.total)),
    ivaBreakdown: [...breakdown.values()].sort(
      (a, b) => a.ivaPercent - b.ivaPercent,
    ),
  };

  if (!totals.total.gt(0))
    throw badRequest("El total de la venta debe ser mayor a 0");

  return { items, totals };
}
