import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { CreateInventoryMovementDto } from "./dto/inventory.dto";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("movements")
  @Roles(Role.ADMIN, Role.VENDEDOR)
  list() {
    return this.inventoryService.list();
  }

  @Get("stock/:productId")
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.ENTREGADOR)
  getStock(@Param("productId") productId: string) {
    return this.inventoryService.getStock(productId);
  }

  @Post("movements")
  @Roles(Role.ADMIN)
  createMovement(
    @Body() dto: CreateInventoryMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.createMovement(dto, user);
  }
}
