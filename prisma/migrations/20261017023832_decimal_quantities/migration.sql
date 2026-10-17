/*
  Warnings:

  - You are about to alter the column `stock` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.
  - You are about to alter the column `minStock` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.
  - You are about to alter the column `quantity` on the `StockMovement` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.
  - You are about to alter the column `stockBefore` on the `StockMovement` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.
  - You are about to alter the column `stockAfter` on the `StockMovement` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.

*/
-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "stock" SET DEFAULT 0,
ALTER COLUMN "stock" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "minStock" SET DEFAULT 0,
ALTER COLUMN "minStock" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "StockMovement" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "stockBefore" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "stockAfter" SET DATA TYPE DECIMAL(12,3);
