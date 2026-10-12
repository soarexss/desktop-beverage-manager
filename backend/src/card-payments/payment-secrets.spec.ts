import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'node:crypto';
import { PaymentSecrets } from './payment-secrets';

describe('PaymentSecrets', () => {
  const secret = randomBytes(32).toString('hex');
  const secrets = new PaymentSecrets(
    new ConfigService({
      CARD_CREDENTIALS_KEY: randomBytes(32).toString('base64'),
      MP_WEBHOOK_SECRET: secret,
    }),
  );
  it('encrypts credentials with a fresh nonce and authenticates ciphertext', () => {
    const value = 'test-only-token';
    const encrypted = secrets.encrypt(value);
    expect(encrypted).not.toContain(value);
    expect(secrets.encrypt(value)).not.toBe(encrypted);
    expect(secrets.decrypt(encrypted)).toBe(value);
    const [iv, tag, data] = encrypted.split('.');
    const altered = Buffer.from(data, 'base64');
    altered[0] ^= 1;
    expect(() =>
      secrets.decrypt([iv, tag, altered.toString('base64')].join('.')),
    ).toThrow();
  });
  it('verifies the provider manifest, rejects forgery and expires stale signatures', () => {
    const sign = (ts: string) =>
      `ts=${ts},v1=${createHmac('sha256', secret).update(`id:ord123;request-id:request-123;ts:${ts};`).digest('hex')}`;
    const ts = String(Date.now());
    expect(() =>
      secrets.verifyWebhook('ORD123', 'request-123', sign(ts)),
    ).not.toThrow();
    expect(() =>
      secrets.verifyWebhook('ORD124', 'request-123', sign(ts)),
    ).toThrow();
    expect(() =>
      secrets.verifyWebhook(
        'ORD123',
        'request-123',
        sign(String(Date.now() - 600000)),
      ),
    ).toThrow();
    expect(() =>
      secrets.verifyWebhook('ORD123', 'request-123', 'ts=bad,v1=bad'),
    ).toThrow();
    expect(() => secrets.verifyWebhook('ORD123', '', sign(ts))).toThrow();
  });
  it('fails closed without an encryption key or webhook secret', () => {
    const missing = new PaymentSecrets(new ConfigService());
    expect(() => missing.encrypt('value')).toThrow();
    expect(() => missing.verifyWebhook('ORD1', 'req', 'signature')).toThrow();
  });
});
