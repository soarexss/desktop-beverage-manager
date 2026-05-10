-- CreateEnum
CREATE TYPE "RegistryType" AS ENUM ('ESTABLISHMENT', 'OPERATION_NATURE', 'TAX_CATEGORY', 'TAX_RULE', 'SUPPLIER', 'SELLER', 'PAYMENT_METHOD', 'CITY', 'ACTIVITY_PROFILE', 'BRAND', 'UNIT', 'SECTION', 'PRODUCT_GROUP', 'PRODUCT_SUBGROUP', 'ICMS_ISS_CALC_FUNCTION', 'COMPLEMENT_SUBSTANCE', 'PROJECT', 'PLATFORM', 'NCM_CODE', 'CFOP_CODE', 'FREIGHT_TABLE', 'CARRIER', 'VEHICLE');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'caixa';
ALTER TYPE "Role" ADD VALUE 'financeiro';
ALTER TYPE "Role" ADD VALUE 'estoquista';
ALTER TYPE "Role" ADD VALUE 'fiscal';
ALTER TYPE "Role" ADD VALUE 'compras';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "activityProfileId" TEXT,
ADD COLUMN     "cityId" TEXT,
ADD COLUMN     "creditLimit" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "brandId" TEXT,
ADD COLUMN     "cfopId" TEXT,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxStock" INTEGER,
ADD COLUMN     "ncmId" TEXT,
ADD COLUMN     "sectionId" TEXT,
ADD COLUMN     "subgroupId" TEXT,
ADD COLUMN     "taxCategoryId" TEXT,
ADD COLUMN     "unitId" TEXT;

-- CreateTable
CREATE TABLE "RegistryEntry" (
    "id" TEXT NOT NULL,
    "type" "RegistryType" NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "stateRegistration" TEXT,
    "municipalRegistration" TEXT,
    "taxRegime" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "fiscalSeries" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceTable" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "marginPercent" DECIMAL(7,3) NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priceTableId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "invoiceNumber" TEXT,
    "accessKey" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "freightAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "batchNumber" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "closedById" TEXT,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(12,2),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "financialTransactionId" TEXT,
    "methodId" TEXT,
    "methodName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "externalReference" TEXT,
    "nsu" TEXT,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "agency" TEXT,
    "accountNumber" TEXT,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankReconciliation" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "externalReference" TEXT,
    "reconciledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "baseAmount" DECIMAL(12,2) NOT NULL,
    "percentage" DECIMAL(7,3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistryEntry_type_isActive_idx" ON "RegistryEntry"("type", "isActive");

-- CreateIndex
CREATE INDEX "RegistryEntry_name_idx" ON "RegistryEntry"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RegistryEntry_type_code_key" ON "RegistryEntry"("type", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Company_document_key" ON "Company"("document");

-- CreateIndex
CREATE INDEX "Branch_isActive_idx" ON "Branch"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_companyId_code_key" ON "Branch"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PriceTable_code_key" ON "PriceTable"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPrice_productId_priceTableId_key" ON "ProductPrice"("productId", "priceTableId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_status_idx" ON "PurchaseOrder"("supplierId", "status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_createdAt_idx" ON "PurchaseOrder"("createdAt");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_productId_idx" ON "PurchaseOrderItem"("productId");

-- CreateIndex
CREATE INDEX "CashSession_status_openedAt_idx" ON "CashSession"("status", "openedAt");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_financialTransactionId_idx" ON "Payment"("financialTransactionId");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");

-- CreateIndex
CREATE INDEX "BankReconciliation_bankAccountId_reconciledAt_idx" ON "BankReconciliation"("bankAccountId", "reconciledAt");

-- CreateIndex
CREATE INDEX "Commission_sellerId_status_idx" ON "Commission"("sellerId", "status");

-- CreateIndex
CREATE INDEX "Commission_orderId_idx" ON "Commission"("orderId");

-- CreateIndex
CREATE INDEX "Product_groupId_subgroupId_idx" ON "Product"("groupId", "subgroupId");

-- CreateIndex
CREATE INDEX "Product_brandId_unitId_idx" ON "Product"("brandId", "unitId");

-- CreateIndex
CREATE INDEX "Product_ncmId_cfopId_idx" ON "Product"("ncmId", "cfopId");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_priceTableId_fkey" FOREIGN KEY ("priceTableId") REFERENCES "PriceTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_financialTransactionId_fkey" FOREIGN KEY ("financialTransactionId") REFERENCES "FinancialTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
