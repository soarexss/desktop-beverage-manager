import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { PaymentSecrets } from './payment-secrets';
import { MercadoPagoClient, MpTokens } from './mercado-pago.client';
import { serializable } from '../common/transaction';
import { ACTIVE_CHARGE_STATES } from './terminal-catalog';

const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
type Credentials = { accessToken: string; refreshToken: string };

@Injectable()
export class PaymentConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly secrets: PaymentSecrets,
    private readonly client: MercadoPagoClient,
  ) {}

  private oauthConfig() {
    const clientId = this.config.get<string>('MP_CLIENT_ID');
    const clientSecret = this.config.get<string>('MP_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('MP_REDIRECT_URI');
    if (
      !clientId ||
      !clientSecret ||
      !redirectUri ||
      !this.config.get<string>('MP_WEBHOOK_SECRET')
    )
      throw new ServiceUnavailableException(
        'Integração não configurada pelo administrador da hospedagem',
      );
    let url: URL;
    try {
      url = new URL(redirectUri);
    } catch {
      throw new ServiceUnavailableException('MP_REDIRECT_URI inválida');
    }
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new ServiceUnavailableException(
        'MP_REDIRECT_URI deve ser uma URL HTTPS fixa',
      );
    this.returnUrl();
    return {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    };
  }

  returnUrl() {
    const value = this.config.get<string>('MP_RETURN_URL') ?? '';
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new ServiceUnavailableException(
        'Configure MP_RETURN_URL para a tela de maquininhas do ERP em HTTPS',
      );
    }
    const origins = (this.config.get<string>('CORS_ORIGIN') ?? '')
      .split(',')
      .map((item) => item.trim());
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.hash ||
      url.search ||
      !origins.includes(url.origin)
    )
      throw new ServiceUnavailableException(
        'MP_RETURN_URL precisa usar uma origem HTTPS autorizada do ERP',
      );
    return url.toString();
  }

  async status() {
    const connection = await this.prisma.paymentConnection.findUnique({
      where: { provider: 'MERCADO_PAGO' },
      select: {
        merchantId: true,
        isActive: true,
        liveMode: true,
        expiresAt: true,
      },
    });
    let configured = true;
    try {
      this.oauthConfig();
      this.secrets.encrypt('configuration-check');
    } catch {
      configured = false;
    }
    return {
      provider: 'MERCADO_PAGO',
      configured,
      connected: Boolean(connection?.isActive),
      merchantId: connection?.merchantId ?? null,
      liveMode: connection?.liveMode ?? null,
    };
  }

  async start(actorId: string) {
    const config = this.oauthConfig();
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(48).toString('base64url');
    await this.prisma.paymentOAuthAttempt.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    await this.prisma.paymentOAuthAttempt.create({
      data: {
        stateHash: digest(state),
        actorId,
        verifier: this.secrets.encrypt(verifier),
        expiresAt: new Date(Date.now() + 600000),
      },
    });
    const url = new URL('https://auth.mercadopago.com/authorization');
    url.search = new URLSearchParams({
      client_id: config.client_id,
      response_type: 'code',
      platform_id: 'mp',
      state,
      redirect_uri: config.redirect_uri,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    }).toString();
    return { state, authorizationUrl: url.toString() };
  }

  async callback(state: string, cookie: string | undefined, code?: string) {
    if (!cookie || cookie !== state)
      throw new UnauthorizedException(
        'Autorização iniciada em outro navegador ou expirada',
      );
    const attempt = await this.prisma.paymentOAuthAttempt.findUnique({
      where: { stateHash: digest(state) },
    });
    if (!attempt || attempt.usedAt || attempt.expiresAt < new Date())
      throw new UnauthorizedException('Autorização expirada');
    const actor = await this.prisma.user.findUnique({
      where: { id: attempt.actorId },
    });
    if (!actor?.isActive || actor.role !== 'admin')
      throw new UnauthorizedException();
    const claimed = await this.prisma.paymentOAuthAttempt.updateMany({
      where: { id: attempt.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1)
      throw new UnauthorizedException('Autorização já utilizada');
    if (!code)
      throw new BadRequestException('Autorização recusada. Inicie novamente.');
    const tokens = await this.client.tokens({
      ...this.oauthConfig(),
      grant_type: 'authorization_code',
      code,
      code_verifier: this.secrets.decrypt(attempt.verifier),
      test_token: this.config.get<string>('MP_TEST_MODE') !== 'false',
    });
    if (
      tokens.live_mode ===
      (this.config.get<string>('MP_TEST_MODE') !== 'false')
    )
      throw new BadRequestException(
        'Conta incompatível com o modo teste/produção configurado',
      );
    await serializable(this.prisma, async (tx) => {
      const previous = await tx.paymentConnection.findUnique({
        where: { provider: 'MERCADO_PAGO' },
      });
      if (
        previous &&
        (previous.merchantId !== String(tokens.user_id) ||
          previous.liveMode !== tokens.live_mode) &&
        (await tx.terminalCharge.count({
          where: { connectionId: previous.id },
        }))
      )
        throw new ConflictException(
          'Esta instância possui cobranças de outra conta. Preserve a conta recebedora do histórico.',
        );
      if (previous && previous.merchantId !== String(tokens.user_id))
        await tx.paymentTerminal.updateMany({
          where: { connectionId: previous.id },
          data: { isActive: false },
        });
      const data = {
        merchantId: String(tokens.user_id),
        ...this.tokenData(tokens),
        liveMode: tokens.live_mode,
        isActive: true,
      };
      const connection = await tx.paymentConnection.upsert({
        where: { provider: 'MERCADO_PAGO' },
        create: { provider: 'MERCADO_PAGO', ...data },
        update: data,
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'card.connection.authorize',
          entityType: 'payment_connection',
          entityId: connection.id,
        },
      });
    });
    return {
      message: 'Conta conectada. Volte ao ERP para selecionar o terminal.',
    };
  }

  private tokenData(tokens: MpTokens) {
    return {
      credentials: this.secrets.encrypt(
        JSON.stringify({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        }),
      ),
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    };
  }

  async access(connectionId?: string) {
    let connection = connectionId
      ? await this.prisma.paymentConnection.findUnique({
          where: { id: connectionId },
        })
      : await this.prisma.paymentConnection.findUnique({
          where: { provider: 'MERCADO_PAGO' },
        });
    if (!connection?.isActive)
      throw new BadRequestException('Conecte a conta Mercado Pago da loja');
    const credentials = JSON.parse(
      this.secrets.decrypt(connection.credentials),
    ) as Credentials;
    if (connection.expiresAt.getTime() > Date.now() + 120000)
      return { connection, token: credentials.accessToken };
    const refreshConnectionId = connection.id;
    return this.prisma.$transaction(
      async (tx) => {
        // Serialize refreshes across processes: rotation must not leave a newer token orphaned.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${refreshConnectionId}))::text`;
        connection = await tx.paymentConnection.findUniqueOrThrow({
          where: { id: refreshConnectionId },
        });
        if (!connection.isActive)
          throw new UnauthorizedException('Conta desconectada');
        const current = JSON.parse(
          this.secrets.decrypt(connection.credentials),
        ) as Credentials;
        if (connection.expiresAt.getTime() > Date.now() + 120000)
          return { connection, token: current.accessToken };
        const tokens = await this.client.tokens({
          ...this.oauthConfig(),
          grant_type: 'refresh_token',
          refresh_token: current.refreshToken,
        });
        if (
          String(tokens.user_id) !== connection.merchantId ||
          tokens.live_mode !== connection.liveMode
        )
          throw new UnauthorizedException('Conta recebedora divergente');
        const saved = await tx.paymentConnection.updateMany({
          where: {
            id: connection.id,
            credentials: connection.credentials,
            isActive: true,
          },
          data: this.tokenData(tokens),
        });
        if (saved.count !== 1)
          throw new ConflictException(
            'Autorização atualizada em paralelo. Tente novamente.',
          );
        connection = await tx.paymentConnection.findUniqueOrThrow({
          where: { id: connection.id },
        });
        return { connection, token: tokens.access_token };
      },
      { maxWait: 10000, timeout: 20000 },
    );
  }

  async remoteTerminals() {
    const { token } = await this.access();
    return this.client.terminals(token);
  }

  async disconnect(actorId: string) {
    return serializable(this.prisma, async (tx) => {
      if (
        await tx.terminalCharge.count({
          where: { status: { in: [...ACTIVE_CHARGE_STATES] } },
        })
      )
        throw new ConflictException(
          'Concilie as cobranças em andamento antes de desconectar',
        );
      const connection = await tx.paymentConnection.findUnique({
        where: { provider: 'MERCADO_PAGO' },
      });
      if (connection) {
        await tx.paymentConnection.update({
          where: { id: connection.id },
          data: { isActive: false, credentials: '' },
        });
        await tx.paymentTerminal.updateMany({
          where: { connectionId: connection.id },
          data: { isActive: false },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'card.connection.disconnect',
            entityType: 'payment_connection',
            entityId: connection.id,
          },
        });
      }
      return {
        message:
          'Conexão removida do ERP. A autorização também pode ser revogada na conta Mercado Pago.',
      };
    });
  }
}
