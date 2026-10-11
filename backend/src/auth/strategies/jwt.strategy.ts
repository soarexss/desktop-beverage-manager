import { UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from '../auth.repository';
import type { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly repository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => req.cookies?.erp_access as string | null,
      ]),
      algorithms: ['HS256'],
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('app.jwtSecret'),
    });
  }

  async validate(payload: AuthenticatedUser) {
    const user = await this.repository.findUserByEmail(payload.email);
    if (
      !user?.isActive ||
      user.id !== payload.sub ||
      user.sessionVersion !== payload.sessionVersion
    )
      throw new UnauthorizedException();
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion,
    };
  }
}
