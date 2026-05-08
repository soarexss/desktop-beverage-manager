import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { ProductsService } from "../products/products.service";
import { CreateInventoryMovementDto } from "./dto/inventory.dto";
import { InventoryRepository } from "./inventory.repository";

@Injectable()
export class InventoryService {
  constructor(
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
}
