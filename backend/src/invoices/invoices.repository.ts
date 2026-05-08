import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.InvoiceUncheckedCreateInput) {
    return this.prisma.invoice.create({ data });
  }

  findAll() {
    return this.prisma.invoice.findMany({
      include: { order: true },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return this.prisma.invoice.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.InvoiceUncheckedUpdateInput) {
    return this.prisma.invoice.update({
      where: { id },
      data,
    });
  }
}
