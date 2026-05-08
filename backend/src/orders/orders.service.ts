import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { ClientsService } from "../clients/clients.service";
import { InventoryRepository } from "../inventory/inventory.repository";
import { ProductsRepository } from "../products/products.repository";
import { CreateOrderDto, UpdateOrderStatusDto } from "./dto/order.dto";
import { OrdersRepository } from "./orders.repository";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersRepository: OrdersRepository,
    private readonly clientsService: ClientsService,
    private readonly productsRepository: ProductsRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly auditService: AuditService,
  ) {}

  findAll(user: AuthenticatedUser) {
    if (user.role === Role.ADMIN) {
      return this.ordersRepository.findAll({});
    }

    if (user.role === Role.VENDEDOR) {
      return this.ordersRepository.findAll({ sellerId: user.sub });
    }

    return this.ordersRepository.findAll({ delivery: { deliveryPersonId: user.sub } });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const order = await this.ordersRepository.findById(id);

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (
      user.role !== Role.ADMIN &&
      order.sellerId !== user.sub &&
      order.delivery?.deliveryPersonId !== user.sub
    ) {
      throw new ForbiddenException("You do not have access to this order");
    }

    return order;
  }

  async create(dto: CreateOrderDto, user: AuthenticatedUser) {
    await this.clientsService.findOne(dto.clientId, user);

    const products = await this.productsRepository.findByIds(
      dto.items.map((item) => item.productId),
    );

    if (products.length !== dto.items.length) {
      throw new BadRequestException("One or more products are invalid");
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    let totalAmount = 0;

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException("Product missing");
      }

      const stock = await this.inventoryRepository.getCurrentStock(item.productId);
      if (stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }

      totalAmount += Number(product.price) * item.quantity;
    }

    const discountAmount = dto.discountAmount ?? 0;
    const netAmount = totalAmount - discountAmount;

    const order = await this.prisma.$transaction(async (transaction) => {
      const createdOrder = await transaction.order.create({
        data: {
          clientId: dto.clientId,
          sellerId: user.sub,
          status: "CONFIRMED",
          notes: dto.notes,
          totalAmount: netAmount,
          discountAmount,
          items: {
            create: dto.items.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: product.price,
                totalPrice: Number(product.price) * item.quantity,
              };
            }),
          },
        },
        include: { items: true },
      });

      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;
        await transaction.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: "OUTBOUND",
            quantity: item.quantity,
            unitCost: product.cost,
            reason: `Order ${createdOrder.id}`,
            createdById: user.sub,
          },
        });
      }

      await transaction.financialTransaction.create({
        data: {
          orderId: createdOrder.id,
          clientId: dto.clientId,
          type: "RECEIVABLE",
          status: "PENDING",
          amount: netAmount,
          description: `Receivable for order ${createdOrder.id}`,
          dueDate: new Date(),
          createdById: user.sub,
        },
      });

      return createdOrder;
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "orders.create",
      entityType: "order",
      entityId: order.id,
      metadata: { totalAmount: netAmount },
    });

    return this.findOne(order.id, user);
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, user: AuthenticatedUser) {
    await this.findOne(id, user);
    const order = await this.ordersRepository.updateStatus(id, dto.status);
    await this.auditService.logAction({
      actorId: user.sub,
      action: "orders.update_status",
      entityType: "order",
      entityId: id,
      metadata: { status: dto.status },
    });
    return order;
  }
}
