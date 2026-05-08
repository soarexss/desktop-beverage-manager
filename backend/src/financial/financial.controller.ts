import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import {
  CreateFinancialTransactionDto,
  UpdateFinancialTransactionDto,
} from "./dto/financial.dto";
import { FinancialService } from "./financial.service";

@Controller("financial")
@Roles(Role.ADMIN)
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  @Get("transactions")
  findAll() {
    return this.financialService.findAll();
  }

  @Get("summary")
  summary() {
    return this.financialService.summary();
  }

  @Post("transactions")
  create(
    @Body() dto: CreateFinancialTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.financialService.create(dto, user);
  }

  @Patch("transactions/:id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateFinancialTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.financialService.update(id, dto, user);
  }
}
