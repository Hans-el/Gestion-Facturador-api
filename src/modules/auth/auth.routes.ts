import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { loginSchema } from "./auth.schemas.js";
import * as authController from "./auth.controller.js";

export const authRoutes = Router();

authRoutes.post("/login", validateBody(loginSchema), authController.login);
authRoutes.get("/me", authenticate, authController.me);
