import { PixService } from './pix.service';
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly pixService: PixService,
  ) {}

  @Get()
  @Roles(
    Role.ADMIN,
    Role.VENDEDOR,
    Role.CAIXA,
    Role.FINANCEIRO,
    Role.FISCAL,
    Role.ENTREGADOR,
  )
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findAll(user);
  }

  @Get(':id/pix')
  @Roles(Role.ADMIN, Role.CAIXA, Role.VENDEDOR, Role.FINANCEIRO)
  pix(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pixService.forOrder(id, user);
  }

  @Get(':id')
  @Roles(
    Role.ADMIN,
    Role.VENDEDOR,
    Role.CAIXA,
    Role.FINANCEIRO,
    Role.FISCAL,
    Role.ENTREGADOR,
  )
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findOne(id, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.CAIXA)
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.create(dto, user);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.CAIXA)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updateStatus(id, dto, user);
  }
}
