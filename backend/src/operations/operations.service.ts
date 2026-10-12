import { Role } from '../common/enums/role.enum';
import { Prisma } from '@prisma/client';

import { serializable } from '../common/transaction';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  CloseCashSessionDto,
  CreateBankAccountDto,
  CreateBankReconciliationDto,
  CreateCashMovementDto,
  CreateCommissionDto,
  CreatePaymentDto,
  CreatePriceTableDto,
  CreatePurchaseOrderDto,
  OpenCashSessionDto,
} from './dto/operations.dto';

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
        by: ['type'],
        _count: { _all: true },
      }),
      this.prisma.purchaseOrder.count(),
      this.prisma.priceTable.count({ where: { isActive: true } }),
      this.prisma.cashSession.count({ where: { status: 'OPEN' } }),
      this.prisma.payment.aggregate({ _sum: { amount: true } }),
      this.prisma.bankAccount.aggregate({ _sum: { balance: true } }),
      this.prisma.commission.aggregate({
        where: { status: 'PENDING' },
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
      orderBy: { name: 'asc' },
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
      action: 'operations.price_table.create',
      entityType: 'price_table',
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPurchase(dto: CreatePurchaseOrderDto, user: AuthenticatedUser) {
    const subtotal = dto.items.reduce(
      (sum, item) =>
        sum.plus(
          new Prisma.Decimal(item.unitCost)
            .mul(item.quantity)
            .toDecimalPlaces(2),
        ),
      new Prisma.Decimal(0),
    );
    const freightAmount = dto.freightAmount ?? 0;
    const discountAmount = dto.discountAmount ?? 0;

    const totalAmount = subtotal
      .plus(freightAmount)
      .minus(discountAmount)
      .toDecimalPlaces(2);

    if (totalAmount.lessThan(0))
      throw new BadRequestException('Desconto maior que o total da compra');

    const status = dto.receiveNow ? 'RECEIVED' : 'DRAFT';
    const receivedAt = dto.receiveNow ? new Date() : undefined;

    const purchase = await serializable(this.prisma, async (transaction) => {
      const existing = await transaction.purchaseOrder.findUnique({
        where: { requestId: dto.requestId },
        include: { items: true },
      });

      if (existing) {
        if (existing.createdById !== user.sub)
          throw new BadRequestException('Identificador já utilizado');

        return existing;
      }

      const created = await transaction.purchaseOrder.create({
        data: {
          requestId: dto.requestId,

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

              totalCost: new Prisma.Decimal(item.unitCost)
                .mul(item.quantity)
                .toDecimalPlaces(2),

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
                type: 'INBOUND',
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

      if (dto.receiveNow && totalAmount.greaterThan(0))
        await transaction.financialTransaction.create({
          data: {
            purchaseOrderId: created.id,
            type: 'PAYABLE',
            amount: totalAmount,
            description: `Compra ${created.id} - ${dto.supplierName}`,
            dueDate: new Date(),
            createdById: user.sub,
          },
        });

      return created;
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: 'operations.purchase.create',
      entityType: 'purchase_order',
      entityId: purchase.id,

      metadata: { totalAmount: totalAmount.toString(), status },
    });

    return purchase;
  }

  async receivePurchase(id: string, user: AuthenticatedUser) {
    const received = await serializable(this.prisma, async (transaction) => {
      const purchase = await transaction.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!purchase) throw new NotFoundException('Compra não encontrada');

      if (purchase.status === 'RECEIVED') return purchase;

      if (purchase.status !== 'DRAFT')
        throw new BadRequestException('Compra não pode ser recebida');

      if (purchase.totalAmount.greaterThan(0))
        await transaction.financialTransaction.create({
          data: {
            purchaseOrderId: id,
            type: 'PAYABLE',
            amount: purchase.totalAmount,
            description: `Compra ${id} - ${purchase.supplierName}`,
            dueDate: new Date(),
            createdById: user.sub,
          },
        });

      for (const item of purchase.items) {
        await transaction.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: 'INBOUND',
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
          status: 'RECEIVED',
          receivedAt: new Date(),
        },
        include: { items: true },
      });
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: 'operations.purchase.receive',
      entityType: 'purchase_order',
      entityId: id,
    });

    return received;
  }

  listCashSessions() {
    return this.prisma.cashSession.findMany({
      include: {
        openedBy: { select: { id: true, name: true, email: true } },
        closedBy: { select: { id: true, name: true, email: true } },
        movements: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  async openCashSession(dto: OpenCashSessionDto, user: AuthenticatedUser) {
    const session = await serializable(this.prisma, async (tx) => {
      if (
        await tx.cashSession.findFirst({
          where: { openedById: user.sub, status: 'OPEN' },
        })
      )
        throw new BadRequestException('Você já tem um caixa aberto');

      return tx.cashSession.create({
        data: {
          openedById: user.sub,
          openingBalance: dto.openingBalance ?? 0,
          notes: dto.notes,
        },
      });
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: 'operations.cash.open',
      entityType: 'cash_session',
      entityId: session.id,
    });

    return session;
  }

  async closeCashSession(
    id: string,
    dto: CloseCashSessionDto,
    user: AuthenticatedUser,
  ) {
    const session = await serializable(this.prisma, async (tx) => {
      const cash = await tx.cashSession.findUnique({
        where: { id },
        include: { movements: true },
      });

      if (!cash || cash.status !== 'OPEN')
        throw new BadRequestException('Caixa indisponível');

      if (cash.openedById !== user.sub && user.role !== Role.ADMIN)
        throw new BadRequestException('Caixa de outro operador');

      const expected = cash.movements.reduce(
        (sum, m) =>
          ['WITHDRAWAL', 'PAYMENT'].includes(m.type)
            ? sum.minus(m.amount)
            : sum.plus(m.amount),
        cash.openingBalance,
      );

      if (!expected.equals(new Prisma.Decimal(dto.closingBalance)))
        throw new BadRequestException(
          `Saldo esperado: ${expected.toFixed(2)}. Revise os movimentos antes de fechar.`,
        );

      return tx.cashSession.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closedById: user.sub,
          closingBalance: expected,
          closedAt: new Date(),
          notes: dto.notes,
        },
      });
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: 'operations.cash.close',
      entityType: 'cash_session',
      entityId: id,
    });

    return session;
  }

  async createCashMovement(
    dto: CreateCashMovementDto,
    user: AuthenticatedUser,
  ) {
    const movement = await serializable(this.prisma, async (tx) => {
      const session = await tx.cashSession.findUnique({
        where: { id: dto.cashSessionId },
        include: { movements: true },
      });

      if (!session || session.status !== 'OPEN')
        throw new BadRequestException('Caixa indisponível');

      if (session.openedById !== user.sub && user.role !== Role.ADMIN)
        throw new BadRequestException('Caixa de outro operador');

      if (['SALE', 'RECEIPT', 'PAYMENT', 'TRANSFER'].includes(dto.type))
        throw new BadRequestException(
          'Use a baixa do título para recebimentos/pagamentos; transferências exigem conta de destino',
        );

      const balance = session.movements.reduce(
        (sum, m) =>
          ['WITHDRAWAL', 'PAYMENT'].includes(m.type)
            ? sum.minus(m.amount)
            : sum.plus(m.amount),
        session.openingBalance,
      );

      if (dto.type === 'WITHDRAWAL' && balance.lessThan(dto.amount))
        throw new BadRequestException('Saldo de caixa insuficiente');

      return tx.cashMovement.create({
        data: { ...dto, createdById: user.sub },
      });
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: 'operations.cash.movement',
      entityType: 'cash_movement',
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
      orderBy: { paidAt: 'desc' },
    });
  }

  async createPayment(dto: CreatePaymentDto, user: AuthenticatedUser) {
    const payment = await serializable(this.prisma, async (transaction) => {
      const existing = await transaction.payment.findUnique({
        where: { requestId: dto.requestId },
      });

      if (existing) {
        if (existing.createdById !== user.sub)
          throw new BadRequestException('Identificador já utilizado');

        if (
          existing.financialTransactionId !== dto.financialTransactionId ||
          existing.methodName !== dto.methodName ||
          !existing.amount.equals(dto.amount) ||
          existing.terminalId !== (dto.terminalId ?? null) ||
          existing.nsu !== (dto.nsu ?? null) ||
          (dto.orderId && existing.orderId !== dto.orderId)
        )
          throw new BadRequestException(
            'Identificador utilizado em outro pagamento',
          );

        return existing;
      }

      if (!dto.financialTransactionId)
        throw new BadRequestException('Selecione um título financeiro');

      if (
        await transaction.terminalCharge.count({
          where: {
            financialTransactionId: dto.financialTransactionId,
            status: { in: ['CREATING', 'PENDING', 'REVIEW'] },
          },
        })
      )
        throw new BadRequestException(
          'Cobrança na maquininha em andamento. Concilie ou cancele no provedor antes da baixa manual.',
        );
      if (dto.terminalId) {
        const terminal = await transaction.paymentTerminal.findUnique({
          where: { id: dto.terminalId },
        });
        if (
          !terminal?.isActive ||
          terminal.mode !== 'MANUAL' ||
          dto.methodName !== 'CARTAO' ||
          !dto.nsu?.trim()
        )
          throw new BadRequestException(
            'Registro manual exige terminal manual ativo, cartão e referência do comprovante',
          );
      }

      const title = await transaction.financialTransaction.findUnique({
        where: { id: dto.financialTransactionId },
        include: { payments: true, order: true },
      });

      if (
        !title ||
        ['PAID', 'CANCELLED'].includes(title.status) ||
        title.order?.status === 'CANCELLED'
      )
        throw new BadRequestException('Título indisponível');

      if (dto.orderId && dto.orderId !== title.orderId)
        throw new BadRequestException('Pedido não corresponde ao título');

      const paid = title.payments.reduce(
        (sum, p) => sum.plus(p.amount),
        new Prisma.Decimal(0),
      );

      const amount = new Prisma.Decimal(dto.amount).toDecimalPlaces(2);

      if (
        amount.lessThanOrEqualTo(0) ||
        paid.plus(amount).greaterThan(title.amount)
      )
        throw new BadRequestException('Valor maior que o saldo ou inválido');

      const created = await transaction.payment.create({
        data: { ...dto, amount, orderId: title.orderId, createdById: user.sub },
      });

      await transaction.financialTransaction.update({
        where: { id: title.id },
        data: {
          status: paid.plus(amount).equals(title.amount) ? 'PAID' : 'PENDING',
          paidAt: paid.plus(amount).equals(title.amount) ? new Date() : null,
        },
      });

      if (dto.methodName === 'DINHEIRO') {
        const cash = await transaction.cashSession.findFirst({
          where: { openedById: user.sub, status: 'OPEN' },
          include: { movements: true },
        });

        if (!cash)
          throw new BadRequestException('Abra seu caixa para lançar dinheiro');

        const balance = cash.movements.reduce(
          (sum, m) =>
            ['WITHDRAWAL', 'PAYMENT'].includes(m.type)
              ? sum.minus(m.amount)
              : sum.plus(m.amount),
          cash.openingBalance,
        );

        if (title.type === 'PAYABLE' && balance.lessThan(amount))
          throw new BadRequestException('Saldo de caixa insuficiente');

        await transaction.cashMovement.create({
          data: {
            cashSessionId: cash.id,
            type: title.type === 'PAYABLE' ? 'PAYMENT' : 'RECEIPT',
            amount,
            methodName: dto.methodName,
            description: title.description,
            reference: created.id,
            createdById: user.sub,
          },
        });
      }

      return created;
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: 'operations.payment.create',
      entityType: 'payment',
      entityId: payment.id,
      metadata: { amount: payment.amount, methodName: payment.methodName },
    });

    return payment;
  }

  listBankAccounts() {
    return this.prisma.bankAccount.findMany({
      include: { reconciliations: { orderBy: { reconciledAt: 'desc' } } },
      orderBy: { name: 'asc' },
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
    return serializable(this.prisma, async (transaction) => {
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

  listCommissions(user: AuthenticatedUser) {
    return this.prisma.commission.findMany({
      where: user.role === Role.VENDEDOR ? { sellerId: user.sub } : {},

      include: {
        order: { include: { client: true } },
        seller: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCommission(dto: CreateCommissionDto, user: AuthenticatedUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
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
      action: 'operations.commission.create',
      entityType: 'commission',
      entityId: commission.id,
      metadata: { orderId: order.id, amount },
    });

    return commission;
  }

  markCommissionPaid(id: string) {
    return this.prisma.commission.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });
  }
}
