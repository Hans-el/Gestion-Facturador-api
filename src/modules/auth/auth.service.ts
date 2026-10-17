import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { forbidden, unauthorized } from "../../utils/error.js";
import { getEffectivePermissions } from "../../utils/permissions.js";

// Hash de relleno para igualar tiempos cuando el usuario no existe
const DUMMY_HASH = bcrypt.hashSync("relleno-no-usar", 12);

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { extraPermissions: true },
  });

  const passwordOk = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );
  if (!user || !passwordOk) throw unauthorized("Credenciales inválidas");
  if (!user.isActive)
    throw forbidden("Tu usuario está desactivado. Contacta al administrador");

  const token = jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: getEffectivePermissions(
        user.role,
        user.extraPermissions.map((p) => p.permission),
      ),
    },
  };
}
