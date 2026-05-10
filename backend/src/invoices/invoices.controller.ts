import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { CreateInvoiceDto, UpdateInvoiceDto } from "./dto/invoice.dto";
import { InvoicesService } from "./invoices.service";

@Controller("invoices")
@Roles(Role.ADMIN, Role.FISCAL, Role.FINANCEIRO)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll() {
    return this.invoicesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.create(dto, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicesService.update(id, dto, user);
  }
}
