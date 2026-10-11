import { PrismaService } from '../database/prisma.service';

import { serializable } from '../common/transaction';

import { BadRequestException } from '@nestjs/common';

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

import { AssignDeliveryDto, UpdateDeliveryStatusDto } from './dto/delivery.dto';
import { DeliveriesRepository } from './deliveries.repository';

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly deliveriesRepository: DeliveriesRepository,

    private readonly auditService: AuditService,
  ) {}

  findAll(user: AuthenticatedUser) {
    return this.deliveriesRepository.findAll(
      user.role === Role.ENTREGADOR ? { deliveryPersonId: user.sub } : {},
    );
  }

  async assign(dto: AssignDeliveryDto, user: AuthenticatedUser) {
    const delivery = await serializable(this.prisma, async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: dto.orderId },
        include: { delivery: true },
      });

      const driver = await tx.user.findUnique({
        where: { id: dto.deliveryPersonId },
      });

      if (!order || order.status !== 'CONFIRMED')
        throw new BadRequestException('Selecione um pedido confirmado');

      if (!driver?.isActive || driver.role !== 'entregador')
        throw new BadRequestException('Entregador indisponível');

      if (
        order.delivery &&
        !['PENDING', 'ASSIGNED', 'FAILED'].includes(order.delivery.status)
      )
        throw new BadRequestException('Entrega já iniciada');

      return tx.delivery.upsert({
        where: { orderId: dto.orderId },
        create: {
          orderId: dto.orderId,
          deliveryPersonId: dto.deliveryPersonId,
          status: 'ASSIGNED',
          notes: dto.notes,
          assignedAt: new Date(),
        },
        update: {
          deliveryPersonId: dto.deliveryPersonId,
          status: 'ASSIGNED',
          notes: dto.notes,
          assignedAt: new Date(),
        },
      });
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: 'deliveries.assign',
      entityType: 'delivery',
      entityId: delivery.id,

      metadata: {
        orderId: dto.orderId,
        deliveryPersonId: dto.deliveryPersonId,
      },
    });

    return delivery;
  }

  async updateStatus(
    id: string,
    dto: UpdateDeliveryStatusDto,
    user: AuthenticatedUser,
  ) {
    const updated = await serializable(this.prisma, async (tx) => {
      const delivery = await tx.delivery.findUnique({
        where: { id },
        include: { order: true },
      });

      if (!delivery) throw new NotFoundException('Entrega não encontrada');

      if (
        user.role === Role.ENTREGADOR &&
        delivery.deliveryPersonId !== user.sub
      )
        throw new ForbiddenException();

      if (delivery.status === dto.status) return delivery;

      const allowed: Record<string, string[]> = {
        PENDING: ['ASSIGNED'],
        ASSIGNED: ['IN_ROUTE', 'FAILED'],
        IN_ROUTE: ['DELIVERED', 'FAILED'],
        FAILED: [],
        DELIVERED: [],
      };

      if (
        !allowed[delivery.status]?.includes(dto.status) ||
        delivery.order.status === 'CANCELLED'
      )
        throw new BadRequestException('Transição de entrega inválida');

      if (
        dto.status === 'IN_ROUTE' ||
        dto.status === 'DELIVERED' ||
        dto.status === 'FAILED'
      )
        await tx.order.update({
          where: { id: delivery.orderId },
          data: {
            status:
              dto.status === 'DELIVERED'
                ? 'COMPLETED'
                : dto.status === 'FAILED'
                  ? 'CONFIRMED'
                  : 'DELIVERING',
          },
        });

      return tx.delivery.update({
        where: { id },
        data: {
          status: dto.status,
          proofUrl: dto.proofUrl,
          deliveredAt: dto.status === 'DELIVERED' ? new Date() : undefined,
        },
      });
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: 'deliveries.update_status',
      entityType: 'delivery',
      entityId: id,
      metadata: { status: dto.status },
    });

    return updated;
  }
}
