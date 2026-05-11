import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { ProductsService } from "../products/products.service";
import {
  AddInventoryCountItemDto,
  CreateInventoryCountSessionDto,
  CreateInventoryMovementDto,
  CreateInventoryReservationDto,
  CreateProductBarcodeDto,
} from "./dto/inventory.dto";
import { InventoryRepository } from "./inventory.repository";

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryRepository: InventoryRepository,
    private readonly productsService: ProductsService,
    private readonly auditService: AuditService,
  ) {}

  list() {
    return this.inventoryRepository.listMovements();
  }

  async createMovement(dto: CreateInventoryMovementDto, user: AuthenticatedUser) {
    const product = await this.productsService.findOne(dto.productId);
    const currentStock = await this.inventoryRepository.getCurrentStock(dto.productId);

    if (dto.type === "OUTBOUND" && currentStock < dto.quantity) {
      throw new BadRequestException("Insufficient stock for outbound movement");
    }

    const movement = await this.inventoryRepository.createMovement({
      productId: product.id,
      type: dto.type,
      quantity: dto.quantity,
      unitCost: dto.unitCost,
      batchNumber: dto.batchNumber,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      reason: dto.reason,
      createdById: user.sub,
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "inventory.create_movement",
      entityType: "inventory_movement",
      entityId: movement.id,
      metadata: { productId: dto.productId, type: dto.type, quantity: dto.quantity },
    });

    return movement;
  }

  getStock(productId: string) {
    return this.inventoryRepository.getCurrentStock(productId);
  }

  async metrics() {
    const today = new Date();
    const next30Days = new Date(today);
    next30Days.setDate(today.getDate() + 30);

    const [products, movements, reservations, openCounts] = await Promise.all([
      this.prisma.product.findMany({
        include: { barcodes: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.inventoryMovement.findMany({
        include: { product: true },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.inventoryReservation.findMany({
        where: { status: "ACTIVE" },
      }),
      this.prisma.inventoryCountSession.count({
        where: { status: { in: ["DRAFT", "COUNTING"] } },
      }),
    ]);

    const stockByProduct = new Map<string, number>();
    let inbound30 = 0;
    let outbound30 = 0;
    let expiringLots = 0;
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    for (const movement of movements) {
      const quantity = Number(movement.quantity);
      const current = stockByProduct.get(movement.productId) ?? 0;
      stockByProduct.set(
        movement.productId,
        current + (movement.type === "OUTBOUND" ? -quantity : quantity),
      );

      if (movement.createdAt >= thirtyDaysAgo) {
        if (movement.type === "OUTBOUND") {
          outbound30 += quantity;
        } else {
          inbound30 += quantity;
        }
      }

      if (
        movement.expiresAt &&
        movement.expiresAt >= today &&
        movement.expiresAt <= next30Days &&
        movement.type !== "OUTBOUND"
      ) {
        expiringLots += 1;
      }
    }

    const reservedByProduct = new Map<string, number>();
    for (const reservation of reservations) {
      reservedByProduct.set(
        reservation.productId,
        (reservedByProduct.get(reservation.productId) ?? 0) +
          Number(reservation.quantity),
      );
    }

    const enriched = products.map((product) => {
      const stock = stockByProduct.get(product.id) ?? 0;
      const reserved = reservedByProduct.get(product.id) ?? 0;
      return {
        ...product,
        currentStock: stock,
        reservedStock: reserved,
        availableStock: stock - reserved,
        costValue: stock * Number(product.cost),
        saleValue: stock * Number(product.price),
      };
    });

    const totalCostValue = enriched.reduce((sum, product) => sum + product.costValue, 0);
    const totalSaleValue = enriched.reduce((sum, product) => sum + product.saleValue, 0);
    const lowStock = enriched.filter((product) => product.currentStock <= product.minStock);
    const zeroStock = enriched.filter((product) => product.currentStock <= 0);
    const abc = [...enriched]
      .sort((a, b) => b.saleValue - a.saleValue)
      .slice(0, 10)
      .map((product, index) => ({
        productId: product.id,
        name: product.name,
        value: product.saleValue,
        class: index < 2 ? "A" : index < 5 ? "B" : "C",
      }));

    return {
      totalProducts: products.length,
      totalCostValue,
      totalSaleValue,
      lowStockCount: lowStock.length,
      zeroStockCount: zeroStock.length,
      expiringLots,
      inbound30,
      outbound30,
      turnover30: totalCostValue > 0 ? outbound30 / Math.max(inbound30, 1) : 0,
      openCounts,
      lowStock: lowStock.slice(0, 10),
      zeroStock: zeroStock.slice(0, 10),
      abc,
    };
  }

  async lookupBarcode(code: string) {
    const normalized = code.trim();
    const direct = await this.prisma.product.findFirst({
      where: {
        OR: [{ sku: normalized }, { barcode: normalized }],
      },
      include: { barcodes: true },
    });

    if (direct) {
      return direct;
    }

    const alias = await this.prisma.productBarcode.findUnique({
      where: { code: normalized },
      include: { product: { include: { barcodes: true } } },
    });

    if (!alias) {
      throw new NotFoundException("Barcode not found");
    }

    return alias.product;
  }

  async createBarcode(dto: CreateProductBarcodeDto, user: AuthenticatedUser) {
    await this.productsService.findOne(dto.productId);

    const barcode = await this.prisma.productBarcode.create({
      data: {
        productId: dto.productId,
        code: dto.code.trim(),
        type: dto.type ?? "EAN",
        source: dto.source,
      },
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "inventory.barcode.create",
      entityType: "product_barcode",
      entityId: barcode.id,
      metadata: { productId: dto.productId, code: dto.code },
    });

    return barcode;
  }

  listCountSessions() {
    return this.prisma.inventoryCountSession.findMany({
      include: {
        items: {
          include: { product: true },
          orderBy: { countedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createCountSession(
    dto: CreateInventoryCountSessionDto,
    user: AuthenticatedUser,
  ) {
    const session = await this.prisma.inventoryCountSession.create({
      data: {
        code: dto.code,
        description: dto.description,
        status: "COUNTING",
        startedAt: new Date(),
        createdById: user.sub,
      },
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "inventory.count.create",
      entityType: "inventory_count_session",
      entityId: session.id,
    });

    return session;
  }

  async addCountItem(
    sessionId: string,
    dto: AddInventoryCountItemDto,
    user: AuthenticatedUser,
  ) {
    const session = await this.prisma.inventoryCountSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException("Inventory count not found");
    }

    if (session.status === "CLOSED" || session.status === "CANCELLED") {
      throw new BadRequestException("Inventory count is not open");
    }

    const product = dto.productId
      ? await this.productsService.findOne(dto.productId)
      : dto.barcode
        ? await this.lookupBarcode(dto.barcode)
        : null;

    if (!product) {
      throw new BadRequestException("Product or barcode is required");
    }

    const expectedQty = await this.inventoryRepository.getCurrentStock(product.id);
    const existing = await this.prisma.inventoryCountItem.findUnique({
      where: {
        sessionId_productId: {
          sessionId,
          productId: product.id,
        },
      },
    });

    const countedQty = Number(existing?.countedQty ?? 0) + dto.countedQty;
    const differenceQty = countedQty - expectedQty;

    const item = await this.prisma.inventoryCountItem.upsert({
      where: {
        sessionId_productId: {
          sessionId,
          productId: product.id,
        },
      },
      update: {
        barcode: dto.barcode,
        expectedQty,
        countedQty,
        differenceQty,
        unitCost: product.cost,
        countedAt: new Date(),
      },
      create: {
        sessionId,
        productId: product.id,
        barcode: dto.barcode,
        expectedQty,
        countedQty,
        differenceQty,
        unitCost: product.cost,
      },
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "inventory.count.item",
      entityType: "inventory_count_item",
      entityId: item.id,
      metadata: { productId: product.id, countedQty, differenceQty },
    });

    return item;
  }

  async closeCountSession(sessionId: string, user: AuthenticatedUser) {
    const session = await this.prisma.inventoryCountSession.findUnique({
      where: { id: sessionId },
      include: { items: true },
    });

    if (!session) {
      throw new NotFoundException("Inventory count not found");
    }

    if (session.status === "CLOSED") {
      throw new BadRequestException("Inventory count already closed");
    }

    const closed = await this.prisma.$transaction(async (transaction) => {
      for (const item of session.items) {
        const difference = Number(item.differenceQty);
        if (difference === 0) {
          continue;
        }

        await transaction.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: difference > 0 ? "INBOUND" : "OUTBOUND",
            quantity: Math.abs(difference),
            unitCost: item.unitCost,
            reason: `Inventory count ${session.id}`,
            createdById: user.sub,
          },
        });
      }

      return transaction.inventoryCountSession.update({
        where: { id: sessionId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
        },
        include: { items: { include: { product: true } } },
      });
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "inventory.count.close",
      entityType: "inventory_count_session",
      entityId: sessionId,
    });

    return closed;
  }

  listReservations() {
    return this.prisma.inventoryReservation.findMany({
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async createReservation(
    dto: CreateInventoryReservationDto,
    user: AuthenticatedUser,
  ) {
    await this.productsService.findOne(dto.productId);
    const currentStock = await this.inventoryRepository.getCurrentStock(dto.productId);
    const reserved = await this.prisma.inventoryReservation.aggregate({
      where: { productId: dto.productId, status: "ACTIVE" },
      _sum: { quantity: true },
    });

    if (currentStock - Number(reserved._sum.quantity ?? 0) < dto.quantity) {
      throw new BadRequestException("Insufficient available stock for reservation");
    }

    const reservation = await this.prisma.inventoryReservation.create({
      data: {
        productId: dto.productId,
        orderId: dto.orderId,
        quantity: dto.quantity,
        reason: dto.reason,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        createdById: user.sub,
      },
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "inventory.reservation.create",
      entityType: "inventory_reservation",
      entityId: reservation.id,
    });

    return reservation;
  }
}
