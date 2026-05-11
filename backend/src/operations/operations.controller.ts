import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import {
  CloseCashSessionDto,
  CreateBankAccountDto,
  CreateBankReconciliationDto,
  CreateCashMovementDto,
  CreateCommissionDto,
  CreatePaymentDto,
  CreatePriceTableDto,
  CreatePurchaseOrderDto,
  OpenCashSessionDto,
} from "./dto/operations.dto";
import { OperationsService } from "./operations.service";

@Controller("operations")
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get("overview")
  @Roles(Role.ADMIN, Role.COMPRAS, Role.ESTOQUISTA, Role.FINANCEIRO, Role.FISCAL)
  overview() {
    return this.operationsService.overview();
  }

  @Get("price-tables")
  @Roles(Role.ADMIN, Role.VENDEDOR, Role.COMPRAS, Role.FINANCEIRO)
  listPriceTables() {
    return this.operationsService.listPriceTables();
  }

  @Post("price-tables")
  @Roles(Role.ADMIN, Role.COMPRAS)
  createPriceTable(@Body() dto: CreatePriceTableDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operationsService.createPriceTable(dto, user);
  }

  @Get("purchases")
  @Roles(Role.ADMIN, Role.COMPRAS, Role.ESTOQUISTA, Role.FINANCEIRO)
  listPurchases() {
    return this.operationsService.listPurchases();
  }

  @Post("purchases")
  @Roles(Role.ADMIN, Role.COMPRAS)
  createPurchase(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operationsService.createPurchase(dto, user);
  }

  @Patch("purchases/:id/receive")
  @Roles(Role.ADMIN, Role.COMPRAS, Role.ESTOQUISTA)
  receivePurchase(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.operationsService.receivePurchase(id, user);
  }

  @Get("cash-sessions")
  @Roles(Role.ADMIN, Role.CAIXA, Role.FINANCEIRO)
  listCashSessions() {
    return this.operationsService.listCashSessions();
  }

  @Post("cash-sessions")
  @Roles(Role.ADMIN, Role.CAIXA, Role.FINANCEIRO)
  openCashSession(@Body() dto: OpenCashSessionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operationsService.openCashSession(dto, user);
  }

  @Patch("cash-sessions/:id/close")
  @Roles(Role.ADMIN, Role.CAIXA, Role.FINANCEIRO)
  closeCashSession(
    @Param("id") id: string,
    @Body() dto: CloseCashSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operationsService.closeCashSession(id, dto, user);
  }

  @Post("cash-movements")
  @Roles(Role.ADMIN, Role.CAIXA, Role.FINANCEIRO)
  createCashMovement(
    @Body() dto: CreateCashMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operationsService.createCashMovement(dto, user);
  }

  @Get("payments")
  @Roles(Role.ADMIN, Role.CAIXA, Role.FINANCEIRO)
  listPayments() {
    return this.operationsService.listPayments();
  }

  @Post("payments")
  @Roles(Role.ADMIN, Role.CAIXA, Role.FINANCEIRO)
  createPayment(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operationsService.createPayment(dto, user);
  }

  @Get("bank-accounts")
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  listBankAccounts() {
    return this.operationsService.listBankAccounts();
  }

  @Post("bank-accounts")
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  createBankAccount(@Body() dto: CreateBankAccountDto) {
    return this.operationsService.createBankAccount(dto);
  }

  @Post("bank-reconciliations")
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  reconcileBank(@Body() dto: CreateBankReconciliationDto) {
    return this.operationsService.reconcileBank(dto);
  }

  @Get("commissions")
  @Roles(Role.ADMIN, Role.FINANCEIRO, Role.VENDEDOR)
  listCommissions() {
    return this.operationsService.listCommissions();
  }

  @Post("commissions")
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  createCommission(@Body() dto: CreateCommissionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operationsService.createCommission(dto, user);
  }

  @Patch("commissions/:id/pay")
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  markCommissionPaid(@Param("id") id: string) {
    return this.operationsService.markCommissionPaid(id);
  }
}
