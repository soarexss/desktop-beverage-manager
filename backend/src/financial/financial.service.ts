import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import {
  CreateChartAccountDto,
  CreateCostCenterDto,
  CreateFinancialTitleDto,
  CreateFinancialTransactionDto,
  SettleFinancialTransactionDto,
  UpdateFinancialTransactionDto,
} from "./dto/financial.dto";
import { FinancialRepository } from "./financial.repository";

@Injectable()
export class FinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialRepository: FinancialRepository,
    private readonly auditService: AuditService,
  ) {}

  findAll() {
    return this.financialRepository.findAll();
  }

  async create(dto: CreateFinancialTransactionDto, user: AuthenticatedUser) {
    const transaction = await this.financialRepository.create({
      ...dto,
      originalAmount: dto.originalAmount ?? dto.amount,
      dueDate: new Date(dto.dueDate),
      createdById: user.sub,
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "financial.create",
      entityType: "financial_transaction",
      entityId: transaction.id,
      metadata: { type: transaction.type, amount: transaction.amount },
    });

    return transaction;
  }

  async createTitle(dto: CreateFinancialTitleDto, user: AuthenticatedUser) {
    const installments = dto.installments ?? dto.totalInstallments ?? 1;
    const intervalDays = dto.intervalDays ?? 30;
    const baseDueDate = new Date(dto.dueDate);
    const installmentAmount = Number((dto.amount / installments).toFixed(2));
    const lastInstallmentAmount = Number(
      (dto.amount - installmentAmount * (installments - 1)).toFixed(2),
    );

    const transactions = await this.prisma.$transaction(
      Array.from({ length: installments }).map((_, index) => {
        const dueDate = new Date(baseDueDate);
        dueDate.setDate(baseDueDate.getDate() + index * intervalDays);
        const amount =
          index === installments - 1 ? lastInstallmentAmount : installmentAmount;

        return this.prisma.financialTransaction.create({
          data: {
            type: dto.type,
            status: dto.status ?? "PENDING",
            amount,
            originalAmount: amount,
            description:
              installments > 1
                ? `${dto.description} (${index + 1}/${installments})`
                : dto.description,
            documentNumber: dto.documentNumber,
            dueDate,
            clientId: dto.clientId,
            orderId: dto.orderId,
            supplierId: dto.supplierId,
            supplierName: dto.supplierName,
            categoryId: dto.categoryId,
            costCenterId: dto.costCenterId,
            paymentMethodId: dto.paymentMethodId,
            paymentMethodName: dto.paymentMethodName,
            installmentNumber: index + 1,
            totalInstallments: installments,
            createdById: user.sub,
          },
        });
      }),
    );

    await this.auditService.logAction({
      actorId: user.sub,
      action: "financial.title.create",
      entityType: "financial_transaction",
      metadata: { type: dto.type, amount: dto.amount, installments },
    });

    return transactions;
  }

  async update(
    id: string,
    dto: UpdateFinancialTransactionDto,
    user: AuthenticatedUser,
  ) {
    const existing = await this.financialRepository.findById(id);

    if (!existing) {
      throw new NotFoundException("Financial transaction not found");
    }

    const transaction = await this.financialRepository.update(id, {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      paidAt: dto.status === "PAID" ? new Date() : undefined,
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "financial.update",
      entityType: "financial_transaction",
      entityId: id,
    });

    return transaction;
  }

  async summary() {
    const openStatuses = ["PENDING", "PARTIAL", "OVERDUE"] as const;
    const titles = await this.prisma.financialTransaction.findMany({
      where: { status: { not: "CANCELLED" } },
      select: {
        type: true,
        status: true,
        amount: true,
        paidAmount: true,
      },
    });

    const summary = titles.reduce(
      (acc, title) => {
        if (!openStatuses.includes(title.status as (typeof openStatuses)[number])) {
          return acc;
        }

        const balance = Number(title.amount) - Number(title.paidAmount);

        if (title.type === "RECEIVABLE") {
          acc.totalReceivables += balance;
        } else {
          acc.totalPayables += balance;
        }

        acc.pendingBalance += balance;

        return acc;
      },
      { totalReceivables: 0, totalPayables: 0, pendingBalance: 0 },
    );

    return {
      totalReceivables: summary.totalReceivables,
      totalPayables: summary.totalPayables,
      pendingBalance: summary.pendingBalance,
    };
  }

  async dashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const now = new Date();

    const next14 = new Date(today);
    next14.setDate(today.getDate() + 14);

    const [
      bankAccounts,
      cashSessions,
      receiveToday,
      payToday,
      overdueReceivables,
      overduePayables,
      futureTitles,
      settlements,
    ] = await Promise.all([
      this.prisma.bankAccount.findMany({ where: { isActive: true } }),
      this.prisma.cashSession.findMany({
        where: { status: "OPEN" },
        include: { movements: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: {
          type: "RECEIVABLE",
          status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
          dueDate: { gte: today, lt: tomorrow },
        },
        _sum: { amount: true, paidAmount: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: {
          type: "PAYABLE",
          status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
          dueDate: { gte: today, lt: tomorrow },
        },
        _sum: { amount: true, paidAmount: true },
      }),
      this.prisma.financialTransaction.findMany({
        where: {
          type: "RECEIVABLE",
          status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
          dueDate: { lt: today },
        },
        include: { client: true },
        orderBy: { dueDate: "asc" },
      }),
      this.prisma.financialTransaction.findMany({
        where: {
          type: "PAYABLE",
          status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
          dueDate: { lt: today },
        },
        orderBy: { dueDate: "asc" },
      }),
      this.prisma.financialTransaction.findMany({
        where: {
          status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
          dueDate: { gte: today, lte: next14 },
        },
        orderBy: { dueDate: "asc" },
      }),
      this.prisma.financialSettlement.findMany({
        where: {
          settledAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14),
          },
        },
        include: { financialTransaction: true },
        orderBy: { settledAt: "asc" },
      }),
    ]);

    const bankBalance = bankAccounts.reduce(
      (sum, account) => sum + Number(account.balance),
      0,
    );
    const cashBalance = cashSessions.reduce((sum, session) => {
      const movementTotal = session.movements.reduce((movementSum, movement) => {
        const amount = Number(movement.amount);
        return movementSum +
          (["WITHDRAWAL", "PAYMENT"].includes(movement.type) ? -amount : amount);
      }, 0);
      return sum + Number(session.openingBalance) + movementTotal;
    }, 0);

    const forecast = Array.from({ length: 14 }).map((_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() + index);
      const dayEnd = new Date(day);
      dayEnd.setDate(day.getDate() + 1);
      const titles = futureTitles.filter(
        (title) => title.dueDate >= day && title.dueDate < dayEnd,
      );
      return {
        date: day.toISOString(),
        receivables: titles
          .filter((title) => title.type === "RECEIVABLE")
          .reduce((sum, title) => sum + Number(title.amount) - Number(title.paidAmount), 0),
        payables: titles
          .filter((title) => title.type === "PAYABLE")
          .reduce((sum, title) => sum + Number(title.amount) - Number(title.paidAmount), 0),
      };
    });

    const realized = settlements.reduce(
      (acc, settlement) => {
        const value =
          Number(settlement.amount) +
          Number(settlement.interestAmount) +
          Number(settlement.penaltyAmount) -
          Number(settlement.discountAmount);

        if (settlement.financialTransaction.type === "RECEIVABLE") {
          acc.income += value;
        } else {
          acc.expense += value;
        }

        return acc;
      },
      { income: 0, expense: 0 },
    );

    return {
      bankBalance,
      cashBalance,
      totalBalance: bankBalance + cashBalance,
      receiveToday:
        Number(receiveToday._sum.amount ?? 0) -
        Number(receiveToday._sum.paidAmount ?? 0),
      payToday:
        Number(payToday._sum.amount ?? 0) -
        Number(payToday._sum.paidAmount ?? 0),
      overdueReceivables: overdueReceivables.reduce(
        (sum, title) => sum + Number(title.amount) - Number(title.paidAmount),
        0,
      ),
      overduePayables: overduePayables.reduce(
        (sum, title) => sum + Number(title.amount) - Number(title.paidAmount),
        0,
      ),
      overdueClients: overdueReceivables.slice(0, 8),
      alerts: [...overdueReceivables.slice(0, 4), ...overduePayables.slice(0, 4)],
      forecast,
      realized,
      estimatedResult: realized.income - realized.expense,
    };
  }

  async settle(
    id: string,
    dto: SettleFinancialTransactionDto,
    user: AuthenticatedUser,
  ) {
    const existing = await this.financialRepository.findById(id);

    if (!existing) {
      throw new NotFoundException("Financial transaction not found");
    }

    if (existing.status === "PAID" || existing.status === "CANCELLED") {
      throw new BadRequestException("Financial transaction is not open");
    }

    const paidAmount = Number(existing.paidAmount) + dto.amount;
    const status = paidAmount >= Number(existing.amount) ? "PAID" : "PARTIAL";

    const settlement = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.financialSettlement.create({
        data: {
          financialTransactionId: id,
          amount: dto.amount,
          interestAmount: dto.interestAmount ?? 0,
          penaltyAmount: dto.penaltyAmount ?? 0,
          discountAmount: dto.discountAmount ?? 0,
          methodId: dto.methodId,
          methodName: dto.methodName,
          receiptNumber: dto.receiptNumber,
          notes: dto.notes,
          createdById: user.sub,
        },
      });

      await transaction.financialTransaction.update({
        where: { id },
        data: {
          paidAmount,
          interestAmount: { increment: dto.interestAmount ?? 0 },
          penaltyAmount: { increment: dto.penaltyAmount ?? 0 },
          discountAmount: { increment: dto.discountAmount ?? 0 },
          status,
          paidAt: status === "PAID" ? new Date() : undefined,
          paymentMethodId: dto.methodId,
          paymentMethodName: dto.methodName,
        },
      });

      await transaction.payment.create({
        data: {
          financialTransactionId: id,
          methodId: dto.methodId,
          methodName: dto.methodName,
          amount:
            dto.amount +
            (dto.interestAmount ?? 0) +
            (dto.penaltyAmount ?? 0) -
            (dto.discountAmount ?? 0),
          externalReference: dto.receiptNumber,
          createdById: user.sub,
        },
      });

      return created;
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "financial.settle",
      entityType: "financial_settlement",
      entityId: settlement.id,
      metadata: { transactionId: id, amount: dto.amount, status },
    });

    return settlement;
  }

  async reopen(id: string, user: AuthenticatedUser) {
    const existing = await this.financialRepository.findById(id);

    if (!existing) {
      throw new NotFoundException("Financial transaction not found");
    }

    const transaction = await this.financialRepository.update(id, {
      status: "PENDING",
      paidAt: null,
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "financial.reopen",
      entityType: "financial_transaction",
      entityId: id,
    });

    return transaction;
  }

  listChartAccounts() {
    return this.prisma.chartAccount.findMany({
      orderBy: [{ type: "asc" }, { code: "asc" }],
    });
  }

  createChartAccount(dto: CreateChartAccountDto) {
    return this.prisma.chartAccount.create({ data: dto });
  }

  listCostCenters() {
    return this.prisma.costCenter.findMany({
      orderBy: { code: "asc" },
    });
  }

  createCostCenter(dto: CreateCostCenterDto) {
    return this.prisma.costCenter.create({ data: dto });
  }
}
