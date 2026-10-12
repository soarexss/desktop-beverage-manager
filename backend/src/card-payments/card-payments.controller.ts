import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  CreateTerminalChargeDto,
  CreateTerminalDto,
  ManualTerminalPaymentDto,
  OAuthCallbackDto,
  TerminalActiveDto,
} from './card-payments.dto';
import { CardPaymentsService } from './card-payments.service';
import { PaymentConnectionsService } from './payment-connections.service';
import { PaymentSecrets } from './payment-secrets';
import { TERMINAL_CATALOG } from './terminal-catalog';

const operators = [Role.ADMIN, Role.CAIXA, Role.VENDEDOR, Role.FINANCEIRO];
function cuid(id: string) {
  if (!/^c[a-z0-9]{24}$/.test(id)) throw new BadRequestException('ID inválido');
  return id;
}

@Controller('card-payments')
export class CardPaymentsController {
  constructor(
    private readonly service: CardPaymentsService,
    private readonly connections: PaymentConnectionsService,
    private readonly secrets: PaymentSecrets,
  ) {}

  @Get('catalog')
  @Roles(...operators)
  catalog() {
    return TERMINAL_CATALOG;
  }

  @Get('terminals')
  @Roles(...operators)
  terminals() {
    return this.service.terminals();
  }

  @Post('terminals')
  @Roles(Role.ADMIN)
  createTerminal(
    @Body() dto: CreateTerminalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createTerminal(dto, user.sub);
  }

  @Patch('terminals/:id')
  @Roles(Role.ADMIN)
  active(
    @Param('id') id: string,
    @Body() dto: TerminalActiveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.setActive(cuid(id), dto.isActive, user.sub);
  }

  @Get('connection')
  @Roles(Role.ADMIN)
  connection() {
    return this.connections.status();
  }

  @Post('connection/disconnect')
  @Roles(Role.ADMIN)
  disconnect(@CurrentUser() user: AuthenticatedUser) {
    return this.connections.disconnect(user.sub);
  }

  @Get('mercado-pago/terminals')
  @Roles(Role.ADMIN)
  remote() {
    return this.connections.remoteTerminals();
  }

  @Post('mercado-pago/authorize')
  @Roles(Role.ADMIN)
  async authorize(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { state, authorizationUrl } = await this.connections.start(user.sub);
    response.cookie('erp_mp_oauth', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/v1/card-payments/mercado-pago/callback',
      maxAge: 600000,
    });
    return { authorizationUrl };
  }

  @Get('mercado-pago/callback')
  @Public()
  async callback(
    @Query() query: OAuthCallbackDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const cookie = (request.cookies as Record<string, string> | undefined)
      ?.erp_mp_oauth;
    response.clearCookie('erp_mp_oauth', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/v1/card-payments/mercado-pago/callback',
    });
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    const returnUrl = new URL(this.connections.returnUrl());
    try {
      await this.connections.callback(query.state, cookie, query.code);
      returnUrl.searchParams.set('mp', 'connected');
    } catch {
      returnUrl.searchParams.set('mp', 'error');
    }
    response.redirect(303, returnUrl.toString());
  }

  @Get('charges')
  @Roles(...operators)
  charges(
    @Query('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.list(cuid(orderId ?? ''), user);
  }

  @Get('charges/pending')
  @Roles(Role.ADMIN, Role.FINANCEIRO)
  pending() {
    return this.service.pending();
  }

  @Get('balance')
  @Roles(...operators)
  balance(
    @Query('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.balance(cuid(orderId ?? ''), user);
  }

  @Post('charges')
  @Roles(...operators)
  create(
    @Body() dto: CreateTerminalChargeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }

  @Post('manual')
  @Roles(...operators)
  manual(
    @Body() dto: ManualTerminalPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.manual(dto, user);
  }

  @Post('charges/:id/sync')
  @Roles(...operators)
  sync(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.sync(cuid(id), user);
  }

  @Post('charges/:id/cancel')
  @Roles(...operators)
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.cancel(cuid(id), user);
  }

  @Post('mercado-pago/webhook')
  @Public()
  @HttpCode(200)
  webhook(@Query('data.id') id: string, @Req() request: Request) {
    if (typeof id !== 'string' || !/^ORD[A-Z0-9]{1,80}$/i.test(id))
      throw new BadRequestException('Identificador externo inválido');
    this.secrets.verifyWebhook(
      id,
      request.get('x-request-id') ?? '',
      request.get('x-signature') ?? '',
    );
    return this.service.webhook(id);
  }
}
