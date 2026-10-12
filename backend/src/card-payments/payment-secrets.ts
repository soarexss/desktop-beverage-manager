import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

@Injectable()
export class PaymentSecrets {
  constructor(private readonly config: ConfigService) {}

  private key() {
    const value = Buffer.from(
      this.config.get<string>('CARD_CREDENTIALS_KEY') ?? '',
      'base64',
    );
    if (value.length !== 32)
      throw new ServiceUnavailableException(
        'Configure CARD_CREDENTIALS_KEY com 32 bytes em Base64',
      );
    return value;
  }

  encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), encrypted]
      .map((part) => part.toString('base64'))
      .join('.');
  }

  decrypt(value: string) {
    const [iv, tag, encrypted] = value
      .split('.')
      .map((part) => Buffer.from(part, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', this.key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }

  verifyWebhook(id: string, requestId: string, signature: string) {
    const secret = this.config.get<string>('MP_WEBHOOK_SECRET');
    if (!secret)
      throw new ServiceUnavailableException('Webhook não configurado');
    const parts = new Map(
      signature.split(',').map((part) => {
        const [key, value] = part.trim().split('=');
        return [key, value] as const;
      }),
    );
    const ts = parts.get('ts') ?? '';
    const v1 = parts.get('v1') ?? '';
    const millis = Number(ts) * (ts?.length === 10 ? 1000 : 1);
    if (
      !/^\d{10,13}$/.test(ts ?? '') ||
      !/^[a-f\d]{64}$/.test(v1 ?? '') ||
      !requestId ||
      requestId.length > 200 ||
      Math.abs(Date.now() - millis) > 300000
    )
      throw new UnauthorizedException('Assinatura inválida ou expirada');
    const expected = createHmac('sha256', secret)
      .update(`id:${id.toLowerCase()};request-id:${requestId};ts:${ts};`)
      .digest();
    if (!timingSafeEqual(expected, Buffer.from(v1, 'hex')))
      throw new UnauthorizedException('Assinatura inválida');
  }
}
