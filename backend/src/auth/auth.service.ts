import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcrypt";
import { add } from "date-fns";
import { AuditService } from "../audit/audit.service";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { AuthRepository } from "./auth.repository";
import { LoginDto, RefreshTokenDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.authRepository.findUserByEmail(dto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException("Account locked due to failed attempts");
    }

    const passwordMatches = await compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      const nextAttempts = user.failedLoginAttempts + 1;
      await this.authRepository.updateLoginState(user.id, {
        failedLoginAttempts: nextAttempts,
        lockedUntil:
          nextAttempts >= 5 ? add(new Date(), { minutes: 15 }) : null,
      });

      await this.auditService.logAction({
        actorId: user.id,
        action: "auth.login.failed",
        entityType: "user",
        entityId: user.id,
        metadata: { email: dto.email },
      });

      throw new UnauthorizedException("Invalid credentials");
    }

    await this.authRepository.updateLoginState(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    });

    const payload: AuthenticatedUser = {
      sub: user.id,
      email: user.email,
      role: user.role as Role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>("app.jwtSecret"),
      expiresIn: this.configService.getOrThrow<string>("app.jwtExpiresIn") as never,
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>("app.jwtRefreshSecret"),
      expiresIn: this.configService.getOrThrow<string>("app.jwtRefreshExpiresIn") as never,
    });

    const refreshTokenHash = await hash(
      refreshToken,
      this.configService.getOrThrow<number>("app.bcryptRounds"),
    );

    await this.authRepository.revokeAllRefreshTokens(user.id);
    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: add(new Date(), { days: 7 }),
    });

    await this.auditService.logAction({
      actorId: user.id,
      action: "auth.login.success",
      entityType: "user",
      entityId: user.id,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(
        dto.refreshToken,
        {
          secret: this.configService.getOrThrow<string>("app.jwtRefreshSecret"),
        },
      );

      const storedToken = await this.authRepository.findRefreshTokenByUser(
        payload.sub,
      );

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException("Refresh token expired");
      }

      const tokenMatches = await compare(dto.refreshToken, storedToken.tokenHash);

      if (!tokenMatches) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      await this.authRepository.revokeRefreshToken(storedToken.id);

      return this.loginWithPayload(payload);
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async logout(user: AuthenticatedUser) {
    await this.authRepository.revokeAllRefreshTokens(user.sub);
    await this.auditService.logAction({
      actorId: user.sub,
      action: "auth.logout",
      entityType: "user",
      entityId: user.sub,
    });

    return { message: "Session closed" };
  }

  private async loginWithPayload(payload: AuthenticatedUser) {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>("app.jwtSecret"),
      expiresIn: this.configService.getOrThrow<string>("app.jwtExpiresIn") as never,
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>("app.jwtRefreshSecret"),
      expiresIn: this.configService.getOrThrow<string>("app.jwtRefreshExpiresIn") as never,
    });

    const refreshTokenHash = await hash(
      refreshToken,
      this.configService.getOrThrow<number>("app.bcryptRounds"),
    );
    await this.authRepository.createRefreshToken({
      userId: payload.sub,
      tokenHash: refreshTokenHash,
      expiresAt: add(new Date(), { days: 7 }),
    });

    return { accessToken, refreshToken };
  }
}
