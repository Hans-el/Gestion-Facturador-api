import type { Role } from "@prisma/client";
import type { Permission } from "../utils/permissions.ts";
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: Role;
        permissions: Permission[];
      };
    }
  }
}

export {};
