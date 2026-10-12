-- CreateEnum
CREATE TYPE "TerminalChargeStatus" AS ENUM ('CREATING', 'PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REVIEW');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "terminalId" TEXT;

-- CreateTable
CREATE TABLE "PaymentConnection" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "liveMode" BOOLEAN NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOAuthAttempt" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "verifier" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentOAuthAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTerminal" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "externalId" TEXT,
    "connectionId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTerminal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerminalCharge" (
    "externalPaymentId" TEXT,
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "financialTransactionId" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "externalTerminalId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "TerminalChargeStatus" NOT NULL DEFAULT 'CREATING',
    "externalId" TEXT,
    "paymentId" TEXT,
    "cancellationRequested" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerminalCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentConnection_provider_key" ON "PaymentConnection"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOAuthAttempt_stateHash_key" ON "PaymentOAuthAttempt"("stateHash");

-- CreateIndex
CREATE INDEX "PaymentOAuthAttempt_expiresAt_idx" ON "PaymentOAuthAttempt"("expiresAt");

-- CreateIndex
CREATE INDEX "PaymentTerminal_isActive_mode_idx" ON "PaymentTerminal"("isActive", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTerminal_provider_externalId_key" ON "PaymentTerminal"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "TerminalCharge_requestId_key" ON "TerminalCharge"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "TerminalCharge_externalId_key" ON "TerminalCharge"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "TerminalCharge_paymentId_key" ON "TerminalCharge"("paymentId");
CREATE UNIQUE INDEX "TerminalCharge_externalPaymentId_key" ON "TerminalCharge"("externalPaymentId");

-- CreateIndex
CREATE INDEX "TerminalCharge_orderId_createdAt_idx" ON "TerminalCharge"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "TerminalCharge_status_updatedAt_idx" ON "TerminalCharge"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "PaymentTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTerminal" ADD CONSTRAINT "PaymentTerminal_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PaymentConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminalCharge" ADD CONSTRAINT "TerminalCharge_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminalCharge" ADD CONSTRAINT "TerminalCharge_financialTransactionId_fkey" FOREIGN KEY ("financialTransactionId") REFERENCES "FinancialTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminalCharge" ADD CONSTRAINT "TerminalCharge_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "PaymentTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminalCharge" ADD CONSTRAINT "TerminalCharge_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PaymentConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminalCharge" ADD CONSTRAINT "TerminalCharge_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve actor attribution and enforce reservations even across application processes.
ALTER TABLE "PaymentOAuthAttempt" ADD CONSTRAINT "PaymentOAuthAttempt_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TerminalCharge" ADD CONSTRAINT "TerminalCharge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TerminalCharge" ADD CONSTRAINT "TerminalCharge_positive" CHECK ("amount" > 0);
ALTER TABLE "PaymentTerminal" ADD CONSTRAINT "PaymentTerminal_mode" CHECK (
  ("mode" = 'MANUAL' AND "connectionId" IS NULL AND "externalId" IS NULL) OR
  ("mode" = 'INTEGRATED' AND "provider" = 'MERCADO_PAGO' AND "connectionId" IS NOT NULL AND "externalId" IS NOT NULL)
);
CREATE UNIQUE INDEX "TerminalCharge_active_order_key" ON "TerminalCharge"("orderId") WHERE "status" IN ('CREATING', 'PENDING', 'REVIEW');
CREATE UNIQUE INDEX "TerminalCharge_active_terminal_key" ON "TerminalCharge"("terminalId") WHERE "status" IN ('CREATING', 'PENDING', 'REVIEW') AND "paymentId" IS NULL;
