// import type { Role } from "../generated/prisma/client.js";
import type { Role } from "@prisma/client";

export const MODULES = [
  "dashboard",
  "products",
  "inventory",
  "sales",
  "orders",
  "customers",
  "reports",
  "invoicing",
  "users",
] as const;

export const ACTIONS = ["view", "create", "edit", "delete"] as const;

export type Module = (typeof MODULES)[number];
export type Action = (typeof ACTIONS)[number];
export type Permission = `${Module}:${Action}`;

export const ALL_PERMISSIONS: Permission[] = MODULES.flatMap((m) =>
  ACTIONS.map((a) => `${m}:${a}` as Permission),
);

const ALL_SET = new Set<string>(ALL_PERMISSIONS);

export function isValidPermission(value: string): value is Permission {
  return ALL_SET.has(value);
}

// Permisos base por rol. Ajústalos a cómo trabaja el negocio.
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ALL_PERMISSIONS,

  VENDEDOR: [
    "dashboard:view",
    "products:view",
    "inventory:view",
    "sales:view",
    "sales:create",
    "sales:edit",
    "orders:view",
    "orders:create",
    "orders:edit",
    "customers:view",
    "customers:create",
    "customers:edit",
    "invoicing:view",
    "invoicing:create",
  ],

  BODEGUERO: [
    "dashboard:view",
    "products:view",
    "products:create",
    "products:edit",
    "inventory:view",
    "inventory:create",
    "inventory:edit",
    "orders:view",
    "orders:edit",
  ],

  CONTADOR: [
    "dashboard:view",
    "products:view",
    "inventory:view",
    "sales:view",
    "orders:view",
    "customers:view",
    "reports:view",
    "invoicing:view",
    "invoicing:create",
  ],
};

// Permisos del rol + los extras del usuario, sin repetidos
export function getEffectivePermissions(
  role: Role,
  extras: string[] = [],
): Permission[] {
  const set = new Set<Permission>(ROLE_PERMISSIONS[role]);
  for (const p of extras) {
    if (isValidPermission(p)) set.add(p);
  }
  return Array.from(set).sort();
}
