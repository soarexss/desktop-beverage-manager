import { Prisma, OrderStatus } from '@prisma/client';

import { serializable, stockInTransaction } from '../common/transaction';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrdersRepository } from './orders.repository';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  findAll(user: AuthenticatedUser) {
    if (
      [Role.ADMIN, Role.CAIXA, Role.FINANCEIRO, Role.FISCAL].includes(user.role)
    ) {
      return this.ordersRepository.findAll({});
    }

    if (user.role === Role.VENDEDOR) {
      return this.ordersRepository.findAll({ sellerId: user.sub });
    }

    return this.ordersRepository.findAll({
      delivery: { deliveryPersonId: user.sub },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const order = await this.ordersRepository.findById(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      ![Role.ADMIN, Role.CAIXA, Role.FINANCEIRO, Role.FISCAL].includes(
        user.role,
      ) &&
      order.sellerId !== user.sub &&
      order.delivery?.deliveryPersonId !== user.sub
    ) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
  }

  async create(dto: CreateOrderDto, user: AuthenticatedUser) {
    const order = await serializable(this.prisma, async (tx) => {
      const existing = await tx.order.findUnique({
        where: { requestId: dto.requestId },
      });

      if (existing) {
        if (existing.sellerId !== user.sub) throw new ForbiddenException();

        return existing;
      }

      const client = await tx.client.findUnique({
        where: { id: dto.clientId },
      });

      if (!client || client.status !== 'ACTIVE')
        throw new BadRequestException('Cliente indisponível');

      if (user.role === Role.VENDEDOR && client.createdById !== user.sub)
        throw new ForbiddenException();

      if (
        new Set(dto.items.map((item) => item.productId)).size !==
        dto.items.length
      )
        throw new BadRequestException('Agrupe produtos repetidos no carrinho');

      const products = await tx.product.findMany({
        where: {
          id: { in: dto.items.map((item) => item.productId) },
          isActive: true,
        },
      });

      if (products.length !== dto.items.length)
        throw new BadRequestException('Produto indisponível');

      const map = new Map(products.map((product) => [product.id, product]));

      let subtotal = new Prisma.Decimal(0);

      for (const item of dto.items) {
        const product = map.get(item.productId)!;

        if ((await stockInTransaction(tx, product.id)).lessThan(item.quantity))
          throw new BadRequestException(
            `Estoque insuficiente: ${product.name}`,
          );

        subtotal = subtotal.plus(
          product.price.mul(item.quantity).toDecimalPlaces(2),
        );
      }

      const discount = new Prisma.Decimal(
        dto.discountAmount ?? 0,
      ).toDecimalPlaces(2);

      if (discount.greaterThan(subtotal))
        throw new BadRequestException('Desconto maior que o subtotal');

      const total = subtotal.minus(discount);

      const created = await tx.order.create({
        data: {
          requestId: dto.requestId,
          clientId: dto.clientId,
          sellerId: user.sub,
          status: 'CONFIRMED',

          totalAmount: total,
          discountAmount: discount,
          notes: dto.notes,

          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: map.get(item.productId)!.price,
              totalPrice: map
                .get(item.productId)!
                .price.mul(item.quantity)
                .toDecimalPlaces(2),
            })),
          },
        },
      });

      for (const item of dto.items)
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: 'OUTBOUND',
            quantity: item.quantity,
            unitCost: map.get(item.productId)!.cost,
            reason: `Order ${created.id}`,
            createdById: user.sub,
          },
        });

      const receivable = await tx.financialTransaction.create({
        data: {
          orderId: created.id,
          clientId: dto.clientId,
          type: 'RECEIVABLE',
          status: total.isZero() ? 'PAID' : 'PENDING',
          amount: total,
          description: `Venda ${created.id}`,
          dueDate: new Date(),
          createdById: user.sub,
        },
      });

      // PIX/card require verification. Generating a QR code never confirms receipt.

      if (dto.paymentMethod === 'DINHEIRO' && total.greaterThan(0)) {
        const cash = await tx.cashSession.findFirst({
          where: { openedById: user.sub, status: 'OPEN' },
        });

        if (!cash)
          throw new BadRequestException(
            'Abra seu caixa antes de receber em dinheiro',
          );

        await tx.payment.create({
          data: {
            orderId: created.id,
            financialTransactionId: receivable.id,
            amount: total,
            methodName: 'DINHEIRO',
            createdById: user.sub,
          },
        });

        await tx.cashMovement.create({
          data: {
            cashSessionId: cash.id,
            type: 'SALE',
            amount: total,
            methodName: 'DINHEIRO',
            description: `Venda ${created.id}`,
            reference: created.id,
            createdById: user.sub,
          },
        });

        await tx.financialTransaction.update({
          where: { id: receivable.id },
          data: { status: 'PAID', paidAt: new Date() },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.sub,
          action: 'orders.create',
          entityType: 'order',
          entityId: created.id,
        },
      });

      return created;
    });

    return this.findOne(order.id, user);
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    user: AuthenticatedUser,
  ) {
    await this.findOne(id, user);

    if (user.role === Role.ENTREGADOR)
      throw new ForbiddenException('Atualize o status da entrega');

    await serializable(this.prisma, async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id },
        include: { items: true, payments: true, invoice: true, delivery: true },
      });

      if (order.status === dto.status) return;

      const transitions: Record<OrderStatus, string[]> = {
        DRAFT: [],
        CONFIRMED: ['DELIVERING', 'COMPLETED', 'CANCELLED'],
        DELIVERING: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: [],
      };

      if (!transitions[order.status].includes(dto.status))
        throw new BadRequestException('Transição de pedido inválida');

      if (order.delivery && dto.status !== 'CANCELLED')
        throw new BadRequestException('Atualize pelo fluxo de entregas');
      if (dto.status === 'CANCELLED') {
        if (
          order.payments.length ||
          (order.invoice &&
            ['PROCESSING', 'AUTHORIZED'].includes(order.invoice.status))
        )
          throw new BadRequestException(
            'Pedido com pagamento ou nota: regularize a devolução/estorno antes do cancelamento',
          );

        for (const item of order.items)
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              type: 'INBOUND',
              quantity: item.quantity,
              reason: `Cancelamento ${id}`,
              createdById: user.sub,
            },
          });

        await tx.invoice.updateMany({
          where: { orderId: id, status: { in: ['PENDING', 'REJECTED'] } },
          data: { status: 'CANCELLED' },
        });
        await tx.financialTransaction.updateMany({
          where: { orderId: id },
          data: { status: 'CANCELLED' },
        });

        await tx.commission.updateMany({
          where: { orderId: id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });

        await tx.delivery.updateMany({
          where: { orderId: id },
          data: { status: 'FAILED', notes: 'Pedido cancelado' },
        });
      }

      await tx.order.update({ where: { id }, data: { status: dto.status } });

      await tx.auditLog.create({
        data: {
          actorId: user.sub,
          action: 'orders.update_status',
          entityType: 'order',
          entityId: id,
          metadata: { status: dto.status },
        },
      });
    });

    return this.findOne(id, user);
  }
}
