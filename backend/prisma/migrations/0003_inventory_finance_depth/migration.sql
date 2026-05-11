-- CreateEnum
CREATE TYPE "InventoryCountStatus" AS ENUM ('DRAFT', 'COUNTING', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('SALE', 'RECEIPT', 'PAYMENT', 'WITHDRAWAL', 'SUPPLY', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "BankTransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "BankTransactionStatus" AS ENUM ('PENDING', 'RECONCILED', 'IGNORED');

-- AlterEnum
ALTER TYPE "FinancialStatus" ADD VALUE 'PARTIAL';
ALTER TYPE "FinancialStatus" ADD VALUE 'RENEGOTIATED';

-- AlterTable
ALTER TABLE "FinancialTransaction" ADD COLUMN "originalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "interestAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "penaltyAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "documentNumber" TEXT,
ADD COLUMN "supplierId" TEXT,
ADD COLUMN "supplierName" TEXT,
ADD COLUMN "categoryId" TEXT,
ADD COLUMN "costCenterId" TEXT,
ADD COLUMN "paymentMethodId" TEXT,
ADD COLUMN "paymentMethodName" TEXT,
ADD COLUMN "installmentNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "totalInstallments" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "parentId" TEXT;

UPDATE "FinancialTransaction" SET "originalAmount" = "amount" WHERE "originalAmount" = 0;

-- CreateTable
CREATE TABLE "ProductBarcode" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EAN',
    "source" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBarcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "status" "InventoryReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCountSession" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "status" "InventoryCountStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCountSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCountItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "barcode" TEXT,
    "expectedQty" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "countedQty" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "differenceQty" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2),
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryCountItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialSettlement" (
    "id" TEXT NOT NULL,
    "financialTransactionId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "interestAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "penaltyAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "methodId" TEXT,
    "methodName" TEXT NOT NULL,
    "receiptNumber" TEXT,
    "notes" TEXT,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "FinancialSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "cashSessionId" TEXT NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "methodName" TEXT,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "type" "BankTransactionType" NOT NULL,
    "status" "BankTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialType" NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChartAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductBarcode_code_key" ON "ProductBarcode"("code");
CREATE INDEX "ProductBarcode_productId_idx" ON "ProductBarcode"("productId");
CREATE INDEX "ProductBarcode_code_idx" ON "ProductBarcode"("code");
CREATE INDEX "InventoryReservation_productId_status_idx" ON "InventoryReservation"("productId", "status");
CREATE INDEX "InventoryReservation_orderId_idx" ON "InventoryReservation"("orderId");
CREATE UNIQUE INDEX "InventoryCountSession_code_key" ON "InventoryCountSession"("code");
CREATE INDEX "InventoryCountSession_status_createdAt_idx" ON "InventoryCountSession"("status", "createdAt");
CREATE UNIQUE INDEX "InventoryCountItem_sessionId_productId_key" ON "InventoryCountItem"("sessionId", "productId");
CREATE INDEX "InventoryCountItem_productId_idx" ON "InventoryCountItem"("productId");
CREATE INDEX "FinancialTransaction_supplierId_idx" ON "FinancialTransaction"("supplierId");
CREATE INDEX "FinancialTransaction_categoryId_idx" ON "FinancialTransaction"("categoryId");
CREATE INDEX "FinancialTransaction_costCenterId_idx" ON "FinancialTransaction"("costCenterId");
CREATE INDEX "FinancialSettlement_financialTransactionId_idx" ON "FinancialSettlement"("financialTransactionId");
CREATE INDEX "FinancialSettlement_settledAt_idx" ON "FinancialSettlement"("settledAt");
CREATE INDEX "CashMovement_cashSessionId_createdAt_idx" ON "CashMovement"("cashSessionId", "createdAt");
CREATE INDEX "CashMovement_type_idx" ON "CashMovement"("type");
CREATE INDEX "BankTransaction_bankAccountId_occurredAt_idx" ON "BankTransaction"("bankAccountId", "occurredAt");
CREATE INDEX "BankTransaction_status_idx" ON "BankTransaction"("status");
CREATE UNIQUE INDEX "ChartAccount_code_key" ON "ChartAccount"("code");
CREATE INDEX "ChartAccount_type_isActive_idx" ON "ChartAccount"("type", "isActive");
CREATE UNIQUE INDEX "CostCenter_code_key" ON "CostCenter"("code");
CREATE INDEX "CostCenter_isActive_idx" ON "CostCenter"("isActive");

-- AddForeignKey
ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InventoryCountSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FinancialTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialSettlement" ADD CONSTRAINT "FinancialSettlement_financialTransactionId_fkey" FOREIGN KEY ("financialTransactionId") REFERENCES "FinancialTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialSettlement" ADD CONSTRAINT "FinancialSettlement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
