import { Injectable } from "@nestjs/common";
import { OrderStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  createOrder(data: Prisma.OrderCreateInput) {
    return this.prisma.order.create({
      data,
      include: {
        items: true,
      },
    });
  }

  findAll(where: Record<string, unknown>) {
    return this.prisma.order.findMany({
      where,
      include: {
        client: true,
        seller: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: { product: true },
        },
        delivery: true,
        invoice: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        seller: true,
        items: {
          include: { product: true },
        },
        delivery: true,
        invoice: true,
      },
    });
  }

  updateStatus(id: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }
}
