import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class FinancialRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.FinancialTransactionUncheckedCreateInput) {
    return this.prisma.financialTransaction.create({ data });
  }

  findAll() {
    return this.prisma.financialTransaction.findMany({
      include: {
        client: true,
        order: true,
        settlements: true,
      },
      orderBy: { dueDate: "asc" },
    });
  }

  findById(id: string) {
    return this.prisma.financialTransaction.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.FinancialTransactionUncheckedUpdateInput) {
    return this.prisma.financialTransaction.update({
      where: { id },
      data,
    });
  }

  summary() {
    return Promise.all([
      this.prisma.financialTransaction.aggregate({
        where: { type: "RECEIVABLE", status: { not: "CANCELLED" } },
        _sum: { amount: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: { type: "PAYABLE", status: { not: "CANCELLED" } },
        _sum: { amount: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: { status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
        _sum: { amount: true },
      }),
    ]);
  }
}
