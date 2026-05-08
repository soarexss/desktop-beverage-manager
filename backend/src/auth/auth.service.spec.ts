import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { hash } from "bcrypt";
import { AuditService } from "../audit/audit.service";
import { Role } from "../common/enums/role.enum";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;
  const authRepository = {
    findUserByEmail: jest.fn(),
    updateLoginState: jest.fn(),
    revokeAllRefreshTokens: jest.fn(),
    createRefreshToken: jest.fn(),
    findRefreshTokenByUser: jest.fn(),
    revokeRefreshToken: jest.fn(),
  } as unknown as jest.Mocked<AuthRepository>;
  const jwtService = {
    signAsync: jest.fn().mockResolvedValueOnce("access-token").mockResolvedValueOnce("refresh-token"),
  } as unknown as jest.Mocked<JwtService>;
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      const map: Record<string, string | number> = {
        "app.jwtSecret": "access-secret",
        "app.jwtRefreshSecret": "refresh-secret",
        "app.jwtExpiresIn": "15m",
        "app.jwtRefreshExpiresIn": "7d",
        "app.bcryptRounds": 4,
      };
      return map[key];
    }),
  } as unknown as jest.Mocked<ConfigService>;
  const auditService = {
    logAction: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;

  beforeEach(() => {
    jest.clearAllMocks();
    (jwtService.signAsync as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce("access-token")
      .mockResolvedValueOnce("refresh-token");
    service = new AuthService(
      authRepository,
      jwtService,
      configService,
      auditService,
    );
  });

  it("blocks locked users before checking password", async () => {
    authRepository.findUserByEmail = jest.fn().mockResolvedValue({
      id: "user-1",
      email: "admin@example.com",
      role: Role.ADMIN,
      name: "Admin",
      isActive: true,
      passwordHash: "hash",
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 1000 * 60),
    });

    await expect(
      service.login({
        email: "admin@example.com",
        password: "12345678",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("returns access and refresh token on successful login", async () => {
    const passwordHash = await hash("12345678", 4);
    authRepository.findUserByEmail = jest.fn().mockResolvedValue({
      id: "user-1",
      email: "seller@example.com",
      role: Role.VENDEDOR,
      name: "Seller",
      isActive: true,
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    const result = await service.login({
      email: "seller@example.com",
      password: "12345678",
    });

    expect(result.accessToken).toBe("access-token");
    expect(result.refreshToken).toBe("refresh-token");
    expect(authRepository.revokeAllRefreshTokens).toHaveBeenCalledWith("user-1");
    expect(authRepository.createRefreshToken).toHaveBeenCalled();
  });
});
