import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class DeliveriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Record<string, unknown>) {
    return this.prisma.delivery.findMany({
      where,
      include: {
        order: {
          include: {
            client: true,
          },
        },
        deliveryPerson: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return this.prisma.delivery.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });
  }

  upsertDelivery(
    orderId: string,
    data: Omit<Prisma.DeliveryUncheckedCreateInput, "orderId">,
  ) {
    return this.prisma.delivery.upsert({
      where: { orderId },
      update: data,
      create: {
        ...data,
        orderId,
      },
    });
  }

  updateStatus(id: string, data: Prisma.DeliveryUncheckedUpdateInput) {
    return this.prisma.delivery.update({
      where: { id },
      data,
    });
  }
}
