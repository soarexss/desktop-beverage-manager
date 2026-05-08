import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class ClientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    tradeName: string;
    legalName: string;
    document: string;
    email?: string;
    phone?: string;
    address: string;
    notes?: string;
    createdById: string;
  }) {
    return this.prisma.client.create({ data });
  }

  findAll(where: Record<string, unknown>) {
    return this.prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return this.prisma.client.findUnique({ where: { id } });
  }

  update(id: string, data: Record<string, unknown>) {
    return this.prisma.client.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.client.delete({ where: { id } });
  }

  purchaseHistory(clientId: string) {
    return this.prisma.order.findMany({
      where: { clientId },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
