import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { productRoutes } from "./modules/products/products.routes.js";
import { categoryRoutes } from "./modules/categories/categories.routes.js";
import { inventoryRoutes } from "./modules/inventory/inventory.routes.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()) }));
app.use(express.json({ limit: "1mb" }));
if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/inventory", inventoryRoutes);

// Siempre al final
app.use(notFoundHandler);
app.use(errorHandler);
