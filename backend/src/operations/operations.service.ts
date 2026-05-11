import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import {
  CloseCashSessionDto,
  CreateBankAccountDto,
  CreateBankReconciliationDto,
  CreateBankTransactionDto,
  CreateCashMovementDto,
  CreateCommissionDto,
  CreatePaymentDto,
  CreatePriceTableDto,
  CreatePurchaseOrderDto,
  OpenCashSessionDto,
  TransferBetweenBankAccountsDto,
} from "./dto/operations.dto";

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async overview() {
    const [
      registryGroups,
      purchaseOrders,
      priceTables,
      openCashSessions,
      payments,
      bankAccounts,
      pendingCommissions,
    ] = await Promise.all([
      this.prisma.registryEntry.groupBy({
        by: ["type"],
        _count: { _all: true },
      }),
      this.prisma.purchaseOrder.count(),
      this.prisma.priceTable.count({ where: { isActive: true } }),
      this.prisma.cashSession.count({ where: { status: "OPEN" } }),
      this.prisma.payment.aggregate({ _sum: { amount: true } }),
      this.prisma.bankAccount.aggregate({ _sum: { balance: true } }),
      this.prisma.commission.aggregate({
        where: { status: "PENDING" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      registryGroups,
      purchaseOrders,
      priceTables,
      openCashSessions,
      totalPayments: Number(payments._sum.amount ?? 0),
      bankBalance: Number(bankAccounts._sum.balance ?? 0),
      pendingCommissions: {
        count: pendingCommissions._count._all,
        amount: Number(pendingCommissions._sum.amount ?? 0),
      },
    };
  }

  listPriceTables() {
    return this.prisma.priceTable.findMany({
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async createPriceTable(dto: CreatePriceTableDto, user: AuthenticatedUser) {
    const table = await this.prisma.priceTable.create({
      data: {
        code: dto.code,
        name: dto.name,
        marginPercent: dto.marginPercent ?? 0,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
        items: dto.items?.length
          ? {
              create: dto.items.map((item) => ({
                productId: item.productId,
                price: item.price,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "operations.price_table.create",
      entityType: "price_table",
      entityId: table.id,
    });

    return table;
  }

  listPurchases() {
    return this.prisma.purchaseOrder.findMany({
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createPurchase(dto: CreatePurchaseOrderDto, user: AuthenticatedUser) {
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0,
    );
    const freightAmount = dto.freightAmount ?? 0;
    const discountAmount = dto.discountAmount ?? 0;
    const totalAmount = subtotal + freightAmount - discountAmount;
    const status = dto.receiveNow ? "RECEIVED" : "DRAFT";
    const receivedAt = dto.receiveNow ? new Date() : undefined;

    const purchase = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.purchaseOrder.create({
        data: {
          supplierId: dto.supplierId,
          supplierName: dto.supplierName,
          invoiceNumber: dto.invoiceNumber,
          accessKey: dto.accessKey,
          subtotal,
          freightAmount,
          discountAmount,
          totalAmount,
          status,
          receivedAt,
          createdById: user.sub,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.quantity * item.unitCost,
              batchNumber: item.batchNumber,
              expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined,
            })),
          },
        },
        include: { items: true },
      });

      if (dto.receiveNow) {
        await Promise.all(
          created.items.map((item) =>
            transaction.inventoryMovement.create({
              data: {
                productId: item.productId,
                type: "INBOUND",
                quantity: item.quantity,
                unitCost: item.unitCost,
                batchNumber: item.batchNumber,
                expiresAt: item.expiresAt,
                reason: `Purchase ${created.id}`,
                createdById: user.sub,
              },
            }),
          ),
        );
      }

      return created;
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "operations.purchase.create",
      entityType: "purchase_order",
      entityId: purchase.id,
      metadata: { totalAmount, status },
    });

    return purchase;
  }

  async receivePurchase(id: string, user: AuthenticatedUser) {
    const purchase = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!purchase) {
      throw new NotFoundException("Purchase order not found");
    }

    if (purchase.status === "RECEIVED") {
      throw new BadRequestException("Purchase order already received");
    }

    const received = await this.prisma.$transaction(async (transaction) => {
      for (const item of purchase.items) {
        await transaction.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: "INBOUND",
            quantity: item.quantity,
            unitCost: item.unitCost,
            batchNumber: item.batchNumber,
            expiresAt: item.expiresAt,
            reason: `Purchase ${purchase.id}`,
            createdById: user.sub,
          },
        });
      }

      return transaction.purchaseOrder.update({
        where: { id },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
        },
        include: { items: true },
      });
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "operations.purchase.receive",
      entityType: "purchase_order",
      entityId: id,
    });

    return received;
  }

  listCashSessions() {
    return this.prisma.cashSession.findMany({
      include: {
        openedBy: { select: { id: true, name: true, email: true } },
        closedBy: { select: { id: true, name: true, email: true } },
        movements: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { openedAt: "desc" },
    });
  }

  async openCashSession(dto: OpenCashSessionDto, user: AuthenticatedUser) {
    const session = await this.prisma.cashSession.create({
      data: {
        openedById: user.sub,
        openingBalance: dto.openingBalance ?? 0,
        notes: dto.notes,
      },
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "operations.cash.open",
      entityType: "cash_session",
      entityId: session.id,
    });

    return session;
  }

  async closeCashSession(
    id: string,
    dto: CloseCashSessionDto,
    user: AuthenticatedUser,
  ) {
    const session = await this.prisma.cashSession.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedById: user.sub,
        closingBalance: dto.closingBalance,
        closedAt: new Date(),
        notes: dto.notes,
      },
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "operations.cash.close",
      entityType: "cash_session",
      entityId: id,
    });

    return session;
  }

  async createCashMovement(dto: CreateCashMovementDto, user: AuthenticatedUser) {
    const session = await this.prisma.cashSession.findUnique({
      where: { id: dto.cashSessionId },
    });

    if (!session) {
      throw new NotFoundException("Cash session not found");
    }

    if (session.status !== "OPEN") {
      throw new BadRequestException("Cash session is closed");
    }

    const movement = await this.prisma.cashMovement.create({
      data: {
        ...dto,
        createdById: user.sub,
      },
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "operations.cash.movement",
      entityType: "cash_movement",
      entityId: movement.id,
      metadata: { type: dto.type, amount: dto.amount },
    });

    return movement;
  }

  listPayments() {
    return this.prisma.payment.findMany({
      include: {
        order: { include: { client: true } },
        financialTransaction: true,
      },
      orderBy: { paidAt: "desc" },
    });
  }

  async createPayment(dto: CreatePaymentDto, user: AuthenticatedUser) {
    const payment = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.payment.create({
        data: {
          ...dto,
          createdById: user.sub,
        },
      });

      if (dto.financialTransactionId) {
        await transaction.financialTransaction.update({
          where: { id: dto.financialTransactionId },
          data: {
            status: "PAID",
            paidAt: new Date(),
          },
        });
      }

      return created;
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "operations.payment.create",
      entityType: "payment",
      entityId: payment.id,
      metadata: { amount: payment.amount, methodName: payment.methodName },
    });

    return payment;
  }

  listBankAccounts() {
    return this.prisma.bankAccount.findMany({
      include: {
        reconciliations: { orderBy: { reconciledAt: "desc" } },
        transactions: { orderBy: { occurredAt: "desc" }, take: 20 },
      },
      orderBy: { name: "asc" },
    });
  }

  createBankAccount(dto: CreateBankAccountDto) {
    return this.prisma.bankAccount.create({
      data: {
        ...dto,
        balance: dto.balance ?? 0,
      },
    });
  }

  async reconcileBank(dto: CreateBankReconciliationDto) {
    return this.prisma.$transaction(async (transaction) => {
      const reconciliation = await transaction.bankReconciliation.create({
        data: dto,
      });

      await transaction.bankAccount.update({
        where: { id: dto.bankAccountId },
        data: {
          balance: {
            increment: dto.amount,
          },
        },
      });

      return reconciliation;
    });
  }

  async createBankTransaction(dto: CreateBankTransactionDto) {
    return this.prisma.$transaction(async (transaction) => {
      const created = await transaction.bankTransaction.create({
        data: dto,
      });

      await transaction.bankAccount.update({
        where: { id: dto.bankAccountId },
        data: {
          balance:
            dto.type === "CREDIT"
              ? { increment: dto.amount }
              : { decrement: dto.amount },
        },
      });

      return created;
    });
  }

  async transferBetweenBankAccounts(dto: TransferBetweenBankAccountsDto) {
    return this.prisma.$transaction(async (transaction) => {
      const description = dto.description ?? "Transferencia entre contas";

      const debit = await transaction.bankTransaction.create({
        data: {
          bankAccountId: dto.fromBankAccountId,
          type: "DEBIT",
          amount: dto.amount,
          description,
          reference: dto.toBankAccountId,
        },
      });

      const credit = await transaction.bankTransaction.create({
        data: {
          bankAccountId: dto.toBankAccountId,
          type: "CREDIT",
          amount: dto.amount,
          description,
          reference: dto.fromBankAccountId,
        },
      });

      await transaction.bankAccount.update({
        where: { id: dto.fromBankAccountId },
        data: { balance: { decrement: dto.amount } },
      });

      await transaction.bankAccount.update({
        where: { id: dto.toBankAccountId },
        data: { balance: { increment: dto.amount } },
      });

      return { debit, credit };
    });
  }

  listCommissions() {
    return this.prisma.commission.findMany({
      include: {
        order: { include: { client: true } },
        seller: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createCommission(dto: CreateCommissionDto, user: AuthenticatedUser) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const baseAmount = Number(order.totalAmount);
    const amount = (baseAmount * dto.percentage) / 100;

    const commission = await this.prisma.commission.create({
      data: {
        orderId: order.id,
        sellerId: dto.sellerId ?? order.sellerId,
        baseAmount,
        percentage: dto.percentage,
        amount,
      },
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "operations.commission.create",
      entityType: "commission",
      entityId: commission.id,
      metadata: { orderId: order.id, amount },
    });

    return commission;
  }

  markCommissionPaid(id: string) {
    return this.prisma.commission.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });
  }
}
