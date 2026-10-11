ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "requestId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "requestId" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN "requestId" TEXT;
ALTER TABLE "FinancialTransaction" ADD COLUMN "purchaseOrderId" TEXT;
CREATE UNIQUE INDEX "Order_requestId_key" ON "Order"("requestId");
CREATE UNIQUE INDEX "Payment_requestId_key" ON "Payment"("requestId");
CREATE UNIQUE INDEX "PurchaseOrder_requestId_key" ON "PurchaseOrder"("requestId");
CREATE UNIQUE INDEX "FinancialTransaction_purchaseOrderId_key" ON "FinancialTransaction"("purchaseOrderId");
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- NOT VALID preserves historical rows, enforcing these rules for new writes.
ALTER TABLE "Order" ADD CONSTRAINT "Order_nonnegative" CHECK ("totalAmount" >= 0 AND "discountAmount" >= 0) NOT VALID;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "Purchase_nonnegative" CHECK ("totalAmount" >= 0 AND "discountAmount" >= 0) NOT VALID;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_positive" CHECK ("amount" > 0) NOT VALID;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_positive" CHECK ("quantity" > 0 AND "unitPrice" >= 0) NOT VALID;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_quantity" CHECK ("quantity" <> 0 AND ("type" = 'ADJUSTMENT' OR "quantity" > 0)) NOT VALID;
-- Old refresh tokens used bcrypt (which truncates long JWTs). Require sign-in again.
UPDATE "RefreshToken" SET "revokedAt" = CURRENT_TIMESTAMP WHERE "revokedAt" IS NULL;
