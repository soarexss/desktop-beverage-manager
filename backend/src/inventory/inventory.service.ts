import { PrismaService } from '../database/prisma.service';

import { serializable, stockInTransaction } from '../common/transaction';

import { BadRequestException, Injectable } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

import { CreateInventoryMovementDto } from './dto/inventory.dto';
import { InventoryRepository } from './inventory.repository';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly inventoryRepository: InventoryRepository,

    private readonly auditService: AuditService,
  ) {}

  list() {
    return this.inventoryRepository.listMovements();
  }

  async createMovement(
    dto: CreateInventoryMovementDto,
    user: AuthenticatedUser,
  ) {
    const movement = await serializable(this.prisma, async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
      });

      if (!product || !product.isActive)
        throw new BadRequestException('Produto indisponível');

      if (!dto.quantity || (dto.type !== 'ADJUSTMENT' && dto.quantity < 0))
        throw new BadRequestException('Quantidade inválida');

      const stock = await stockInTransaction(tx, dto.productId);

      const next =
        dto.type === 'OUTBOUND'
          ? stock.minus(dto.quantity)
          : stock.plus(dto.quantity);

      if (next.lessThan(0))
        throw new BadRequestException('Movimento deixaria estoque negativo');

      return tx.inventoryMovement.create({
        data: {
          ...dto,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          createdById: user.sub,
        },
      });
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: 'inventory.create_movement',
      entityType: 'inventory_movement',
      entityId: movement.id,

      metadata: {
        productId: dto.productId,
        type: dto.type,
        quantity: dto.quantity,
      },
    });

    return movement;
  }

  getStock(productId: string) {
    return this.inventoryRepository.getCurrentStock(productId);
  }
}
