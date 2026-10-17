-- CreateEnum
CREATE TYPE "IdentificationType" AS ENUM ('CEDULA', 'RUC', 'PASAPORTE', 'CONSUMIDOR_FINAL', 'EXTERIOR');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "idType" "IdentificationType" NOT NULL,
    "idNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_idNumber_key" ON "Customer"("idNumber");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
