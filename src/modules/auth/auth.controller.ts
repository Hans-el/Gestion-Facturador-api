import type { RequestHandler } from "express";
import * as authService from "./auth.service.js";

export const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body;
  res.json(await authService.login(email, password));
};

// Devuelve la sesión actual (útil para que el frontend revalide al recargar)
export const me: RequestHandler = (req, res) => {
  res.json({ user: req.user });
};
