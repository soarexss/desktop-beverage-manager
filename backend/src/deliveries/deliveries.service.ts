import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { OrdersService } from "../orders/orders.service";
import { AssignDeliveryDto, UpdateDeliveryStatusDto } from "./dto/delivery.dto";
import { DeliveriesRepository } from "./deliveries.repository";

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly deliveriesRepository: DeliveriesRepository,
    private readonly ordersService: OrdersService,
    private readonly auditService: AuditService,
  ) {}

  findAll(user: AuthenticatedUser) {
    return this.deliveriesRepository.findAll(
      user.role === Role.ENTREGADOR ? { deliveryPersonId: user.sub } : {},
    );
  }

  async assign(dto: AssignDeliveryDto, user: AuthenticatedUser) {
    await this.ordersService.findOne(dto.orderId, {
      sub: user.sub,
      email: user.email,
      role: Role.ADMIN,
    });

    const delivery = await this.deliveriesRepository.upsertDelivery(dto.orderId, {
      deliveryPersonId: dto.deliveryPersonId,
      status: "ASSIGNED",
      notes: dto.notes,
      assignedAt: new Date(),
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "deliveries.assign",
      entityType: "delivery",
      entityId: delivery.id,
      metadata: { orderId: dto.orderId, deliveryPersonId: dto.deliveryPersonId },
    });

    return delivery;
  }

  async updateStatus(
    id: string,
    dto: UpdateDeliveryStatusDto,
    user: AuthenticatedUser,
  ) {
    const delivery = await this.deliveriesRepository.findById(id);

    if (!delivery) {
      throw new NotFoundException("Delivery not found");
    }

    if (user.role === Role.ENTREGADOR && delivery.deliveryPersonId !== user.sub) {
      throw new ForbiddenException("You do not have access to this delivery");
    }

    const updated = await this.deliveriesRepository.updateStatus(id, {
      status: dto.status,
      proofUrl: dto.proofUrl,
      deliveredAt: dto.status === "DELIVERED" ? new Date() : undefined,
    });

    await this.auditService.logAction({
      actorId: user.sub,
      action: "deliveries.update_status",
      entityType: "delivery",
      entityId: id,
      metadata: { status: dto.status },
    });

    return updated;
  }
}
