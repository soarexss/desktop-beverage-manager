import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import {
  AddInventoryCountItemDto,
  CreateInventoryCountSessionDto,
  CreateInventoryMovementDto,
  CreateInventoryReservationDto,
  CreateProductBarcodeDto,
} from "./dto/inventory.dto";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("movements")
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.ESTOQUISTA, Role.COMPRAS)
  list() {
    return this.inventoryService.list();
  }

  @Get("metrics")
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.ENTREGADOR, Role.ESTOQUISTA, Role.COMPRAS)
  metrics() {
    return this.inventoryService.metrics();
  }

  @Get("barcodes/:code")
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.ENTREGADOR, Role.ESTOQUISTA, Role.COMPRAS)
  lookupBarcode(@Param("code") code: string) {
    return this.inventoryService.lookupBarcode(code);
  }

  @Post("barcodes")
  @Roles(Role.ADMIN, Role.ESTOQUISTA, Role.COMPRAS)
  createBarcode(
    @Body() dto: CreateProductBarcodeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.createBarcode(dto, user);
  }

  @Get("stock/:productId")
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.ENTREGADOR, Role.ESTOQUISTA, Role.COMPRAS)
  getStock(@Param("productId") productId: string) {
    return this.inventoryService.getStock(productId);
  }

  @Post("movements")
  @Roles(Role.ADMIN, Role.ESTOQUISTA, Role.COMPRAS)
  createMovement(
    @Body() dto: CreateInventoryMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.createMovement(dto, user);
  }

  @Get("counts")
  @Roles(Role.ADMIN, Role.ESTOQUISTA)
  listCountSessions() {
    return this.inventoryService.listCountSessions();
  }

  @Post("counts")
  @Roles(Role.ADMIN, Role.ESTOQUISTA)
  createCountSession(
    @Body() dto: CreateInventoryCountSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.createCountSession(dto, user);
  }

  @Post("counts/:id/items")
  @Roles(Role.ADMIN, Role.ESTOQUISTA)
  addCountItem(
    @Param("id") id: string,
    @Body() dto: AddInventoryCountItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.addCountItem(id, dto, user);
  }

  @Patch("counts/:id/close")
  @Roles(Role.ADMIN, Role.ESTOQUISTA)
  closeCountSession(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.closeCountSession(id, user);
  }

  @Get("reservations")
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.ESTOQUISTA)
  listReservations() {
    return this.inventoryService.listReservations();
  }

  @Post("reservations")
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.ESTOQUISTA)
  createReservation(
    @Body() dto: CreateInventoryReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.createReservation(dto, user);
  }
}
