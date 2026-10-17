import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { forbidden, unauthorized } from "../utils/error.js";
import {
  getEffectivePermissions,
  type Permission,
} from "../utils/permissions.js";

export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw unauthorized("Token requerido");

  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(header.slice(7), env.JWT_SECRET);
  } catch {
    throw unauthorized("Token inválido o expirado");
  }
  if (typeof payload === "string" || !payload.sub)
    throw unauthorized("Token inválido");

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { extraPermissions: true },
  });
  if (!user || !user.isActive) throw unauthorized("Usuario no autorizado");

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: getEffectivePermissions(
      user.role,
      user.extraPermissions.map((p) => p.permission),
    ),
  };
  next();
};

// Exige TODOS los permisos indicados. Uso: requirePermission('products:edit')
export const requirePermission =
  (...required: Permission[]): RequestHandler =>
  (req, _res, next) => {
    const user = req.user;
    if (!user) throw unauthorized();
    if (!required.every((p) => user.permissions.includes(p))) throw forbidden();
    next();
  };
