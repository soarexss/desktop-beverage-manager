import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, TerminalCharge, TerminalChargeStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import { serializable } from '../common/transaction';
import {
  CreateTerminalChargeDto,
  CreateTerminalDto,
  ManualTerminalPaymentDto,
} from './card-payments.dto';
import { OperationsService } from '../operations/operations.service';
import { ACTIVE_CHARGE_STATES, TERMINAL_CATALOG } from './terminal-catalog';
import { MercadoPagoClient, MpOrder } from './mercado-pago.client';
import { PaymentConnectionsService } from './payment-connections.service';

@Injectable()
export class CardPaymentsService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private reconciling = false;
  private readonly logger = new Logger(CardPaymentsService.name);
  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      void this.reconcilePending();
    }, 60000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  private async reconcilePending() {
    if (this.reconciling) return;
    this.reconciling = true;
    try {
      const charges = await this.prisma.terminalCharge.findMany({
        where: { status: { in: ['CREATING', 'PENDING'] } },
        orderBy: { updatedAt: 'asc' },
        take: 20,
      });
      for (const charge of charges) {
        try {
          await this.reconcile(charge);
        } catch {
          this.logger.warn(
            `Cobrança ${charge.id} aguarda reconciliação com o provedor`,
          );
        }
      }
    } catch {
      this.logger.warn('Reconciliação de maquininhas indisponível');
    } finally {
      this.reconciling = false;
    }
  }
  constructor(
    private readonly prisma: PrismaService,
    private readonly connections: PaymentConnectionsService,
    private readonly client: MercadoPagoClient,
    private readonly operations: OperationsService,
  ) {}

  async manual(dto: ManualTerminalPaymentDto, user: AuthenticatedUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) throw new NotFoundException();
    this.authorize(order.sellerId, user);
    const previous = await this.prisma.payment.findUnique({
      where: { requestId: dto.requestId },
    });
    if (previous) {
      if (
        previous.createdById !== user.sub ||
        previous.orderId !== dto.orderId ||
        previous.terminalId !== dto.terminalId ||
        previous.nsu !== dto.nsu ||
        !previous.amount.equals(dto.amount)
      )
        throw new ConflictException('Identificador já utilizado');
      return previous;
    }
    const title = await this.prisma.financialTransaction.findFirst({
      where: {
        orderId: dto.orderId,
        type: 'RECEIVABLE',
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      include: { payments: true },
    });
    if (!title) throw new BadRequestException('Pedido sem saldo pendente');
    const balance = title.amount.minus(
      title.payments.reduce(
        (sum, item) => sum.plus(item.amount),
        new Prisma.Decimal(0),
      ),
    );
    if (!balance.equals(dto.amount))
      throw new ConflictException(
        'Saldo mudou. Confira novamente o valor do pedido antes de registrar.',
      );
    return this.operations.createPayment(
      {
        requestId: dto.requestId,
        financialTransactionId: title.id,
        terminalId: dto.terminalId,
        orderId: dto.orderId,
        amount: dto.amount,
        methodName: 'CARTAO',
        nsu: dto.nsu,
      },
      user,
    );
  }

  async balance(orderId: string, user: AuthenticatedUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        financialTransactions: {
          where: { type: 'RECEIVABLE' },
          include: { payments: true },
        },
      },
    });
    if (!order) throw new NotFoundException();
    this.authorize(order.sellerId, user);
    const title = order.financialTransactions.find((item) =>
      ['PENDING', 'OVERDUE'].includes(item.status),
    );
    const amount = title
      ? title.amount.minus(
          title.payments.reduce(
            (sum, item) => sum.plus(item.amount),
            new Prisma.Decimal(0),
          ),
        )
      : new Prisma.Decimal(0);
    return { amount: amount.toFixed(2), orderStatus: order.status };
  }

  terminals() {
    return this.prisma.paymentTerminal.findMany({ orderBy: { label: 'asc' } });
  }

  pending() {
    return this.prisma.terminalCharge.findMany({
      where: { status: { in: [...ACTIVE_CHARGE_STATES] } },
      orderBy: { updatedAt: 'asc' },
      take: 100,
      include: { terminal: { select: { label: true } } },
    });
  }

  async createTerminal(dto: CreateTerminalDto, actorId: string) {
    const provider = TERMINAL_CATALOG.find(
      (entry) => entry.provider === dto.provider,
    );
    if (!provider) throw new BadRequestException('Provedora desconhecida');
    let connectionId: string | undefined;
    if (dto.mode === 'INTEGRATED') {
      if (
        !provider.automatic ||
        !(provider.models as readonly string[]).includes(dto.model)
      )
        throw new BadRequestException(
          'Modelo disponível apenas para registro manual neste ERP',
        );
      if (!dto.externalId)
        throw new BadRequestException(
          'Selecione um terminal da conta conectada',
        );
      const { connection, token } = await this.connections.access();
      const terminal = (await this.client.terminals(token)).find(
        (item) => item.id === dto.externalId,
      );
      if (!terminal || terminal.operating_mode !== 'PDV')
        throw new BadRequestException(
          'Terminal não pertence à conta ou não está em modo PDV. Configure loja/caixa no Mercado Pago.',
        );
      connectionId = connection.id;
    } else if (dto.externalId)
      throw new BadRequestException(
        'ID externo é reservado a terminais integrados',
      );
    return serializable(this.prisma, async (tx) => {
      if (
        connectionId &&
        !(await tx.paymentConnection.findFirst({
          where: { id: connectionId, isActive: true },
        }))
      )
        throw new ConflictException('Conta desconectada');
      if (
        dto.externalId &&
        (await tx.paymentTerminal.findFirst({
          where: { provider: dto.provider, externalId: dto.externalId },
        }))
      )
        throw new ConflictException(
          'Terminal já cadastrado; reative o cadastro existente',
        );
      const terminal = await tx.paymentTerminal.create({
        data: { ...dto, connectionId },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'card.terminal.create',
          entityType: 'payment_terminal',
          entityId: terminal.id,
        },
      });
      return terminal;
    });
  }

  async setActive(id: string, isActive: boolean, actorId: string) {
    return serializable(this.prisma, async (tx) => {
      const terminal = await tx.paymentTerminal.findUnique({ where: { id } });
      if (!terminal) throw new NotFoundException();
      if (
        await tx.terminalCharge.count({
          where: { terminalId: id, status: { in: [...ACTIVE_CHARGE_STATES] } },
        })
      )
        throw new ConflictException('Terminal possui cobrança em andamento');
      if (
        isActive &&
        terminal.connectionId &&
        !(await tx.paymentConnection.findFirst({
          where: { id: terminal.connectionId, isActive: true },
        }))
      )
        throw new BadRequestException('Conecte a conta antes de reativar');
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'card.terminal.active',
          entityType: 'payment_terminal',
          entityId: id,
          metadata: { isActive },
        },
      });
      return tx.paymentTerminal.update({ where: { id }, data: { isActive } });
    });
  }

  private authorize(sellerId: string, user: AuthenticatedUser) {
    if (user.role === Role.VENDEDOR && sellerId !== user.sub)
      throw new ForbiddenException();
  }

  async list(orderId: string, user: AuthenticatedUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException();
    this.authorize(order.sellerId, user);
    return this.prisma.terminalCharge.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  private async ownedCharge(id: string, user: AuthenticatedUser) {
    const charge = await this.prisma.terminalCharge.findUnique({
      where: { id },
      include: { order: { select: { sellerId: true } } },
    });
    if (!charge) throw new NotFoundException();
    this.authorize(charge.order.sellerId, user);
    return charge;
  }

  async create(dto: CreateTerminalChargeDto, user: AuthenticatedUser) {
    const charge = await serializable(this.prisma, async (tx) => {
      const existing = await tx.terminalCharge.findUnique({
        where: { requestId: dto.requestId },
      });
      if (existing) {
        if (
          existing.orderId !== dto.orderId ||
          existing.terminalId !== dto.terminalId ||
          existing.createdById !== user.sub
        )
          throw new ConflictException('Identificador usado em outra cobrança');
        return existing;
      }
      const order = await tx.order.findUnique({ where: { id: dto.orderId } });
      if (!order || order.status === 'CANCELLED')
        throw new BadRequestException('Pedido indisponível');
      this.authorize(order.sellerId, user);
      const terminal = await tx.paymentTerminal.findUnique({
        where: { id: dto.terminalId },
        include: { connection: true },
      });
      if (
        !terminal?.isActive ||
        terminal.mode !== 'INTEGRATED' ||
        terminal.provider !== 'MERCADO_PAGO' ||
        !terminal.externalId ||
        !terminal.connection?.isActive
      )
        throw new BadRequestException(
          'Terminal não disponível para cobrança automática',
        );
      const title = await tx.financialTransaction.findFirst({
        where: {
          orderId: order.id,
          type: 'RECEIVABLE',
          status: { in: ['PENDING', 'OVERDUE'] },
        },
        include: { payments: true },
      });
      if (!title) throw new BadRequestException('Pedido sem saldo pendente');
      const amount = title.amount.minus(
        title.payments.reduce(
          (sum, payment) => sum.plus(payment.amount),
          new Prisma.Decimal(0),
        ),
      );
      if (amount.lessThanOrEqualTo(0))
        throw new BadRequestException('Pedido sem saldo');
      if (
        await tx.terminalCharge.count({
          where: {
            status: { in: [...ACTIVE_CHARGE_STATES] },
            OR: [
              { orderId: order.id },
              { terminalId: terminal.id, paymentId: null },
            ],
          },
        })
      )
        throw new ConflictException(
          'Pedido ou terminal já possui cobrança em andamento. Consulte o status.',
        );
      const created = await tx.terminalCharge.create({
        data: {
          ...dto,
          financialTransactionId: title.id,
          connectionId: terminal.connection.id,
          merchantId: terminal.connection.merchantId,
          externalTerminalId: terminal.externalId,
          createdById: user.sub,
          amount,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.sub,
          action: 'card.charge.create',
          entityType: 'terminal_charge',
          entityId: created.id,
        },
      });
      return created;
    });
    return this.reconcile(charge);
  }

  async sync(id: string, user: AuthenticatedUser) {
    return this.reconcile(await this.ownedCharge(id, user));
  }

  private async reconcile(charge: TerminalCharge) {
    if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(charge.status))
      return charge;
    const { connection, token } = await this.connections.access(
      charge.connectionId,
    );
    if (connection.merchantId !== charge.merchantId)
      throw new ConflictException('Conta recebedora divergente');
    if (
      !charge.externalId &&
      Date.now() - charge.createdAt.getTime() > 20 * 3600000
    )
      throw new ConflictException(
        'Cobrança sem retorno há mais de 20h. Confira no provedor e contate o suporte; não gere outra cobrança.',
      );
    const remote = charge.externalId
      ? await this.client.get(token, charge.externalId)
      : await this.client.create(
          token,
          charge.externalTerminalId,
          charge.id,
          charge.amount.toFixed(2),
          charge.requestId,
        );
    return this.applyRemote(charge.id, remote);
  }

  async cancel(id: string, user: AuthenticatedUser) {
    const charge = await this.ownedCharge(id, user);
    if (!charge.externalId)
      throw new ConflictException(
        'Consulte o status para recuperar o ID antes de cancelar',
      );
    if (
      charge.paymentId ||
      !ACTIVE_CHARGE_STATES.includes(
        charge.status as (typeof ACTIVE_CHARGE_STATES)[number],
      )
    )
      throw new ConflictException(
        'Cobrança liquidada/encerrada: estorno exige o fluxo do provedor',
      );
    const { token } = await this.connections.access(charge.connectionId);
    await this.prisma.terminalCharge.update({
      where: { id },
      data: { cancellationRequested: true },
    });
    // A cancellation request can race with approval. Only a provider query releases the reservation.
    await this.client.cancel(
      token,
      charge.externalId,
      `cancel-${charge.requestId}`,
    );
    return this.reconcile(
      await this.prisma.terminalCharge.findUniqueOrThrow({ where: { id } }),
    );
  }

  async webhook(externalId: string) {
    const charge = await this.prisma.terminalCharge.findUnique({
      where: { externalId },
    });
    if (charge) await this.reconcile(charge);
    // Early webhook before POST response is recovered by the persisted request ID and operator sync.
    return { received: true };
  }

  private async applyRemote(id: string, remote: MpOrder) {
    return serializable(this.prisma, async (tx) => {
      const charge = await tx.terminalCharge.findUniqueOrThrow({
        where: { id },
      });
      const payments = remote.transactions?.payments;
      let valid =
        typeof remote.id === 'string' &&
        /^ORD[A-Z0-9]{1,80}$/i.test(remote.id) &&
        remote.type === 'point' &&
        remote.external_reference === charge.id &&
        (remote.user_id === undefined ||
          String(remote.user_id) === charge.merchantId) &&
        (!charge.externalId || charge.externalId === remote.id) &&
        (!remote.config?.point?.terminal_id ||
          remote.config.point.terminal_id === charge.externalTerminalId);
      try {
        valid =
          valid &&
          payments?.length === 1 &&
          new Prisma.Decimal(payments[0].amount).equals(charge.amount);
      } catch {
        valid = false;
      }
      if (!valid) {
        await tx.auditLog.create({
          data: {
            action: 'card.charge.mismatch',
            entityType: 'terminal_charge',
            entityId: id,
          },
        });
        return tx.terminalCharge.update({
          where: { id },
          data: { status: 'REVIEW' },
        });
      }
      const payment = payments![0];
      let status: TerminalChargeStatus = 'PENDING';
      const approved =
        remote.status === 'processed' &&
        payment.status === 'processed' &&
        payment.status_detail === 'accredited';
      const terminalStates: Record<string, TerminalChargeStatus> = {
        canceled: 'CANCELLED',
        cancelled: 'CANCELLED',
        failed: 'FAILED',
        expired: 'EXPIRED',
      };
      status = approved ? 'PAID' : (terminalStates[remote.status] ?? 'PENDING');
      if (
        (charge.paymentId && !approved) ||
        (status !== 'PAID' && payment.status === 'processed')
      )
        status = 'REVIEW';
      if (
        ['refunded', 'charged_back', 'partially_refunded'].includes(
          remote.status,
        ) ||
        ['refunded', 'charged_back', 'partially_refunded'].includes(
          payment.status,
        )
      )
        status = 'REVIEW';
      let paymentId = charge.paymentId;
      if (approved && !paymentId) {
        const title = await tx.financialTransaction.findUniqueOrThrow({
          where: { id: charge.financialTransactionId },
          include: { payments: true, order: true },
        });
        const paid = title.payments.reduce(
          (sum, item) => sum.plus(item.amount),
          new Prisma.Decimal(0),
        );
        let paidAmountMatches = false;
        try {
          paidAmountMatches = new Prisma.Decimal(
            payment.paid_amount ?? '',
          ).equals(charge.amount);
        } catch {
          /* malformed provider response requires review */
        }
        if (
          !paidAmountMatches ||
          typeof payment.id !== 'string' ||
          !/^PAY[A-Z0-9]{1,100}$/i.test(payment.id) ||
          title.order?.status === 'CANCELLED' ||
          ['CANCELLED', 'PAID'].includes(title.status) ||
          !paid.plus(charge.amount).equals(title.amount)
        ) {
          status = 'REVIEW';
        } else {
          const created = await tx.payment.create({
            data: {
              requestId: charge.requestId,
              orderId: charge.orderId,
              financialTransactionId: title.id,
              terminalId: charge.terminalId,
              amount: charge.amount,
              methodName: 'CARTAO',
              externalReference: remote.id,
              createdById: charge.createdById,
            },
          });
          paymentId = created.id;
          await tx.financialTransaction.update({
            where: { id: title.id },
            data: { status: 'PAID', paidAt: new Date() },
          });
        }
      }
      if (status !== charge.status)
        await tx.auditLog.create({
          data: {
            action: 'card.charge.status',
            entityType: 'terminal_charge',
            entityId: id,
            metadata: { status },
          },
        });
      return tx.terminalCharge.update({
        where: { id },
        data: {
          externalId: remote.id,
          externalPaymentId:
            typeof payment.id === 'string' ? payment.id : undefined,
          status,
          paymentId,
        },
      });
    });
  }
}
