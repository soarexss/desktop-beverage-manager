import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  createMovement(data: Prisma.InventoryMovementUncheckedCreateInput) {
    return this.prisma.inventoryMovement.create({ data });
  }

  listMovements() {
    return this.prisma.inventoryMovement.findMany({
      include: {
        product: true,
        createdBy: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getCurrentStock(productId: string) {
    const inbound = await this.prisma.inventoryMovement.aggregate({
      where: {
        productId,
        type: { in: ["INBOUND", "ADJUSTMENT"] },
      },
      _sum: { quantity: true },
    });
    const outbound = await this.prisma.inventoryMovement.aggregate({
      where: {
        productId,
        type: "OUTBOUND",
      },
      _sum: { quantity: true },
    });

    return Number(inbound._sum.quantity ?? 0) - Number(outbound._sum.quantity ?? 0);
  }
}
