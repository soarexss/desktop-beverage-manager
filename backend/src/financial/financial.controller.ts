import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import {
  CreateChartAccountDto,
  CreateCostCenterDto,
  CreateFinancialTitleDto,
  CreateFinancialTransactionDto,
  SettleFinancialTransactionDto,
  UpdateFinancialTransactionDto,
} from "./dto/financial.dto";
import { FinancialService } from "./financial.service";

@Controller("financial")
@Roles(Role.ADMIN, Role.FINANCEIRO, Role.CAIXA)
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

  @Get("dashboard")
  dashboard() {
    return this.financialService.dashboard();
  }

  @Post("transactions")
  create(
    @Body() dto: CreateFinancialTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.financialService.create(dto, user);
  }

  @Post("titles")
  createTitle(
    @Body() dto: CreateFinancialTitleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.financialService.createTitle(dto, user);
  }

  @Patch("transactions/:id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateFinancialTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.financialService.update(id, dto, user);
  }

  @Post("transactions/:id/settlements")
  settle(
    @Param("id") id: string,
    @Body() dto: SettleFinancialTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.financialService.settle(id, dto, user);
  }

  @Patch("transactions/:id/reopen")
  reopen(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.financialService.reopen(id, user);
  }

  @Get("chart-accounts")
  listChartAccounts() {
    return this.financialService.listChartAccounts();
  }

  @Post("chart-accounts")
  createChartAccount(@Body() dto: CreateChartAccountDto) {
    return this.financialService.createChartAccount(dto);
  }

  @Get("cost-centers")
  listCostCenters() {
    return this.financialService.listCostCenters();
  }

  @Post("cost-centers")
  createCostCenter(@Body() dto: CreateCostCenterDto) {
    return this.financialService.createCostCenter(dto);
  }
}
