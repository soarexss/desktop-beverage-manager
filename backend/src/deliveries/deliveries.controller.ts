import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { AssignDeliveryDto, UpdateDeliveryStatusDto } from "./dto/delivery.dto";
import { DeliveriesService } from "./deliveries.service";

@Controller("deliveries")
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.ENTREGADOR)
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveriesService.findAll(user);
  }

  @Post("assign")
  @Roles(Role.ADMIN)
  assign(@Body() dto: AssignDeliveryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.deliveriesService.assign(dto, user);
  }

  @Patch(":id/status")
  @Roles(Role.ADMIN, Role.ENTREGADOR)
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateDeliveryStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveriesService.updateStatus(id, dto, user);
  }
}
