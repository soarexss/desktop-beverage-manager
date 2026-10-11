import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

import type { Request, Response, CookieOptions } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AuthService } from './auth.service';

import { AuthRepository } from './auth.repository';

import { LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly repository: AuthRepository,
  ) {}

  private options(): CookieOptions {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/v1/auth',
    };
  }

  private cookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    res.cookie('erp_access', tokens.accessToken, {
      ...this.options(),
      path: '/v1',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('erp_refresh', tokens.refreshToken, {
      ...this.options(),
      maxAge: 7 * 86400000,
    });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    this.cookies(res, result);

    return { user: result.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.erp_refresh as string | undefined;

    if (!refreshToken) throw new UnauthorizedException();

    this.cookies(res, await this.authService.refreshToken({ refreshToken }));

    return { message: 'Sessão renovada' };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    const record = await this.repository.findUserByEmail(user.email);

    if (!record?.isActive) throw new UnauthorizedException();

    return {
      id: record.id,
      name: record.name,
      email: record.email,
      role: record.role,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(user);

    res.clearCookie('erp_access', { ...this.options(), path: '/v1' });

    res.clearCookie('erp_refresh', this.options());

    return result;
  }
}
