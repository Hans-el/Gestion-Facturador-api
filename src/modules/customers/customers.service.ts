import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { badRequest, conflict, notFound } from "../../utils/error.js";
import { getPagination, paginated } from "../../utils/pagination.js";
import type { CustomerInput, ListCustomersQuery } from "./customers.schemas.js";

async function getOrFail(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw notFound("Cliente no encontrado");
  return customer;
}

// "Consumidor final" es del sistema: no se edita ni se da de baja
function assertEditable(customer: { idType: string }) {
  if (customer.idType === "CONSUMIDOR_FINAL") {
    throw badRequest(
      '"Consumidor final" es un cliente del sistema y no se puede modificar',
    );
  }
}

async function assertIdFree(idNumber: string, excludeId?: string) {
  const exists = await prisma.customer.findFirst({
    where: { idNumber, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { name: true, isActive: true },
  });
  if (exists) {
    throw conflict(
      `Ya existe un cliente con la identificación ${idNumber}: ${exists.name}${
        exists.isActive ? "" : " (dado de baja, puedes reactivarlo)"
      }`,
    );
  }
}

export async function list(query: ListCustomersQuery) {
  const { page, limit, search, status } = query;

  const where: Prisma.CustomerWhereInput = {
    ...(status === "all" ? {} : { isActive: status === "active" }),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { idNumber: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      ...getPagination(page, limit),
    }),
  ]);

  return paginated(items, total, page, limit);
}

export const getById = getOrFail;

export async function create(input: CustomerInput) {
  await assertIdFree(input.idNumber);
  return prisma.customer.create({ data: input });
}

// Reemplazo completo (PUT): lo que no se envía se limpia
export async function update(id: string, input: CustomerInput) {
  const current = await getOrFail(id);
  assertEditable(current);
  if (input.idNumber !== current.idNumber)
    await assertIdFree(input.idNumber, id);

  return prisma.customer.update({
    where: { id },
    data: {
      idType: input.idType,
      idNumber: input.idNumber,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
    },
  });
}

export async function deactivate(id: string) {
  assertEditable(await getOrFail(id));
  return prisma.customer.update({ where: { id }, data: { isActive: false } });
}

export async function reactivate(id: string) {
  assertEditable(await getOrFail(id));
  return prisma.customer.update({ where: { id }, data: { isActive: true } });
}
