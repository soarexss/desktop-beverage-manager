import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { DateRangeReportDto } from "./dto/report.dto";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async salesSummary(filters: DateRangeReportDto) {
    const createdAt = this.buildDateRange(filters);

    const [orders, receivables, topProducts] = await Promise.all([
      this.prisma.order.aggregate({
        where: { createdAt },
        _sum: { totalAmount: true, discountAmount: true },
        _count: { _all: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: {
          type: "RECEIVABLE",
          createdAt,
        },
        _sum: { amount: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true, totalPrice: true },
        orderBy: {
          _sum: {
            totalPrice: "desc",
          },
        },
        take: 5,
      }),
    ]);

    return {
      totalOrders: orders._count._all,
      grossSales: Number(orders._sum.totalAmount ?? 0),
      totalDiscounts: Number(orders._sum.discountAmount ?? 0),
      receivables: Number(receivables._sum.amount ?? 0),
      topProducts,
    };
  }

  async inventorySummary() {
    const products = await this.prisma.product.findMany({
      include: {
        inventoryMovements: true,
      },
      orderBy: { name: "asc" },
    });

    const lowStock = products
      .map((product) => {
        const stock = product.inventoryMovements.reduce((sum, movement) => {
          const quantity = Number(movement.quantity);
          return sum + (movement.type === "OUTBOUND" ? -quantity : quantity);
        }, 0);

        return { ...product, currentStock: stock };
      })
      .filter((product) => product.currentStock <= product.minStock)
      .slice(0, 10);

    return {
      products: products.length,
      lowStock,
    };
  }

  private buildDateRange(filters: DateRangeReportDto) {
    if (!filters.startDate && !filters.endDate) {
      return undefined;
    }

    return {
      gte: filters.startDate ? new Date(filters.startDate) : undefined,
      lte: filters.endDate ? new Date(filters.endDate) : undefined,
    };
  }
}
