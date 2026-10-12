-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "municipalityCode" TEXT,
ADD COLUMN     "operationalKey" TEXT,
ADD COLUMN     "pixEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pixKey" TEXT,
ADD COLUMN     "pixMerchantCity" TEXT,
ADD COLUMN     "pixMerchantName" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "primaryCnae" TEXT,
ADD COLUMN     "secondaryCnaes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "dueDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FiscalImport" (
    "id" TEXT NOT NULL,
    "accessKey" TEXT NOT NULL,
    "xmlHash" TEXT NOT NULL,
    "xmlContent" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiscalImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FiscalImport_accessKey_key" ON "FiscalImport"("accessKey");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalImport_purchaseOrderId_key" ON "FiscalImport"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_operationalKey_key" ON "Company"("operationalKey");
CREATE INDEX "PurchaseOrder_accessKey_idx" ON "PurchaseOrder"("accessKey");

-- AddForeignKey
ALTER TABLE "FiscalImport" ADD CONSTRAINT "FiscalImport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalImport" ADD CONSTRAINT "FiscalImport_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Company" ADD CONSTRAINT "Company_operationalKey_check" CHECK ("operationalKey" IS NULL OR "operationalKey" = 'PRIMARY');
ALTER TABLE "FiscalImport" ADD CONSTRAINT "FiscalImport_accessKey_check" CHECK ("accessKey" ~ '^[0-9]{44}$');
ALTER TABLE "FiscalImport" ADD CONSTRAINT "FiscalImport_xmlSize_check" CHECK (octet_length("xmlContent") <= 524288);
