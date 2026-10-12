import { Test } from '@nestjs/testing';
import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import {
  MercadoPagoClient,
  MpOrder,
} from '../src/card-payments/mercado-pago.client';
import { PaymentSecrets } from '../src/card-payments/payment-secrets';
import { PaymentConnectionsService } from '../src/card-payments/payment-connections.service';

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite(
  'Card payments contract and persistence (disposable PostgreSQL; provider simulated)',
  () => {
    let app: INestApplication;
    let db: PrismaClient;
    let adminId: string;
    let otherId: string;
    let clientId: string;
    let connectionId: string;
    let terminalId: string;
    let manualTerminalId: string;
    let cookies: string[];
    let sellerCookies: string[];
    const origin = 'https://erp.test';
    const password = 'Disposable-card-test-password!';
    const email = `card-${randomUUID()}@example.com`;
    const webhookSecret = randomBytes(32).toString('hex');
    const externalTerminalId = `TERMINAL_TEST_${randomUUID()}`;
    const remoteOrders = new Map<string, MpOrder>();
    const createKeys = new Map<string, string>();
    let loseCreateResponse = false;
    const gateway = {
      tokens: jest.fn().mockResolvedValue({
        access_token: 'test-only-access',
        refresh_token: 'test-only-refresh',
        user_id: 12345,
        expires_in: 3600,
        live_mode: false,
      }),
      terminals: jest.fn().mockResolvedValue([
        { id: externalTerminalId, operating_mode: 'PDV' },
        { id: 'NOT_PDV', operating_mode: 'STANDALONE' },
      ]),
      create: jest.fn(
        (
          _token: string,
          terminal: string,
          reference: string,
          amount: string,
          key: string,
        ) => {
          let id = createKeys.get(key);
          if (!id) {
            id = `ORD${randomBytes(12).toString('hex').toUpperCase()}`;
            createKeys.set(key, id);
            remoteOrders.set(id, {
              id,
              user_id: 12345,
              type: 'point',
              external_reference: reference,
              status: 'created',
              config: { point: { terminal_id: terminal } },
              transactions: {
                payments: [{ id: `PAY${id}`, amount, status: 'created' }],
              },
            });
          }
          if (loseCreateResponse) {
            loseCreateResponse = false;
            throw new ServiceUnavailableException('Simulated lost response');
          }
          return Promise.resolve(structuredClone(remoteOrders.get(id)!));
        },
      ),
      get: jest.fn((_token: string, id: string) =>
        Promise.resolve(structuredClone(remoteOrders.get(id)!)),
      ),
      cancel: jest.fn((_token: string, id: string) => {
        const order = remoteOrders.get(id)!;
        order.status = 'canceled';
        order.transactions!.payments![0].status = 'canceled';
        return Promise.resolve(structuredClone(order));
      }),
    };
    function data<T>(res: request.Response): T {
      return (res.body as { data: T }).data;
    }
    const call = (
      method: 'get' | 'post' | 'patch',
      path: string,
      auth = cookies,
    ) =>
      request(app.getHttpServer() as Server)
        [method](`/v1/card-payments${path}`)
        .set('Cookie', auth)
        .set('Origin', origin);
    async function order() {
      return db.order.create({
        data: {
          clientId,
          sellerId: adminId,
          status: 'CONFIRMED',
          totalAmount: 10,
          financialTransactions: {
            create: {
              clientId,
              createdById: adminId,
              type: 'RECEIVABLE',
              amount: 10,
              description: 'Card test',
              dueDate: new Date(),
            },
          },
        },
        include: { financialTransactions: true },
      });
    }
    async function charge(orderId: string) {
      const response = await call('post', '/charges').send({
        requestId: randomUUID(),
        orderId,
        terminalId,
      });
      expect(response.status).toBe(201);
      return data<{ id: string; externalId: string; status: string }>(response);
    }
    const approve = (id: string) => {
      const remote = remoteOrders.get(id)!;
      remote.status = 'processed';
      Object.assign(remote.transactions!.payments![0], {
        status: 'processed',
        status_detail: 'accredited',
        paid_amount: '10.00',
      });
    };
    function notify(id: string, valid = true) {
      const ts = String(Date.now());
      const requestId = randomUUID();
      const signature = createHmac('sha256', webhookSecret)
        .update(`id:${id.toLowerCase()};request-id:${requestId};ts:${ts};`)
        .digest('hex');
      return request(app.getHttpServer() as Server)
        .post(`/v1/card-payments/mercado-pago/webhook?data.id=${id}`)
        .set('x-request-id', requestId)
        .set('x-signature', `ts=${ts},v1=${valid ? signature : '0'.repeat(64)}`)
        .send({ data: { id }, action: 'order.processed' });
    }
    beforeAll(async () => {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      process.env.CORS_ORIGIN = origin;
      process.env.CARD_CREDENTIALS_KEY = randomBytes(32).toString('base64');
      process.env.MP_WEBHOOK_SECRET = webhookSecret;
      process.env.MP_CLIENT_ID = 'test-only-client';
      process.env.MP_CLIENT_SECRET = 'test-only-secret';
      process.env.MP_REDIRECT_URI =
        'https://erp.test/v1/card-payments/mercado-pago/callback';
      process.env.MP_RETURN_URL = 'https://erp.test/maquininhas';
      process.env.MP_TEST_MODE = 'true';
      process.env.THROTTLE_LIMIT = '10000';
      db = new PrismaClient();
      const admin = await db.user.create({
        data: {
          name: 'Card test admin',
          email,
          passwordHash: await hash(password, 4),
          role: 'admin',
        },
      });
      adminId = admin.id;
      const seller = await db.user.create({
        data: {
          name: 'Other seller',
          email: `seller-${email}`,
          passwordHash: await hash(password, 4),
          role: 'vendedor',
        },
      });
      otherId = seller.id;
      clientId = (
        await db.client.create({
          data: {
            tradeName: 'Card test client',
            legalName: 'Card test',
            address: 'Endereço de teste descartável',
            document: randomUUID().replaceAll('-', '').slice(0, 14),
            createdById: adminId,
          },
        })
      ).id;
      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(MercadoPagoClient)
        .useValue(gateway)
        .compile();
      app = module.createNestApplication();
      configureApp(app);
      await app.init();
      for (const loginEmail of [email, `seller-${email}`]) {
        const response = await request(app.getHttpServer() as Server)
          .post('/v1/auth/login')
          .set('Origin', origin)
          .send({ email: loginEmail, password });
        expect(response.status).toBe(200);
        if (loginEmail === email)
          cookies = response.headers['set-cookie'] as unknown as string[];
        else
          sellerCookies = response.headers['set-cookie'] as unknown as string[];
      }
    }, 30000);
    afterAll(async () => {
      await app?.close();
      await db?.$disconnect();
    });

    it('requires authentication and admin role for connection/configuration', async () => {
      expect(
        (
          await request(app.getHttpServer() as Server).get(
            '/v1/card-payments/terminals',
          )
        ).status,
      ).toBe(401);
      expect((await call('get', '/connection', sellerCookies)).status).toBe(
        403,
      );
      expect(
        (await call('post', '/terminals', sellerCookies).send({})).status,
      ).toBe(403);
      const response = await call('get', '/catalog');
      expect(
        data<Array<{ provider: string }>>(response).length,
      ).toBeGreaterThan(5);
    });
    it('completes OAuth with PKCE, browser binding, one-use state and encrypted tokens', async () => {
      const response = await call('post', '/mercado-pago/authorize').send({});
      expect(response.status).toBe(201);
      const url = new URL(
        data<{ authorizationUrl: string }>(response).authorizationUrl,
      );
      const state = url.searchParams.get('state')!;
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      const connections = app.get(PaymentConnectionsService);
      await expect(
        connections.callback(state, 'wrong-browser', 'test-code'),
      ).rejects.toThrow();
      const oauthCookies = response.headers[
        'set-cookie'
      ] as unknown as string[];
      const result = await request(app.getHttpServer() as Server)
        .get(
          `/v1/card-payments/mercado-pago/callback?state=${state}&code=test-code`,
        )
        .set('Cookie', oauthCookies);
      expect(result.status).toBe(303);
      expect(result.headers.location).toBe(
        'https://erp.test/maquininhas?mp=connected',
      );
      await expect(
        connections.callback(state, state, 'test-code'),
      ).rejects.toThrow();
      const connection = await db.paymentConnection.findUniqueOrThrow({
        where: { provider: 'MERCADO_PAGO' },
      });
      connectionId = connection.id;
      expect(connection.credentials).not.toContain('test-only-access');
      const publicStatus = await call('get', '/connection');
      expect(JSON.stringify(publicStatus.body)).not.toContain('test-only');
      expect(data<{ connected: boolean }>(publicStatus).connected).toBe(true);
      expect(app.get(PaymentSecrets).decrypt(connection.credentials)).toContain(
        'test-only-access',
      );
    });
    it('refreshes expired authorization only once under concurrent terminal queries', async () => {
      await db.paymentConnection.update({
        where: { id: connectionId },
        data: { expiresAt: new Date(0) },
      });
      const before = gateway.tokens.mock.calls.length;
      const responses = await Promise.all([
        call('get', '/mercado-pago/terminals'),
        call('get', '/mercado-pago/terminals'),
      ]);
      expect(responses.map((response) => response.status)).toEqual([200, 200]);
      expect(gateway.tokens.mock.calls.length - before).toBe(1);
    });
    it('creates manual devices for other providers and validates Point account/mode', async () => {
      const manual = await call('post', '/terminals').send({
        provider: 'PAGBANK',
        model: 'Moderninha Smart 2',
        label: 'Manual card test',
        mode: 'MANUAL',
      });
      expect(manual.status).toBe(201);
      manualTerminalId = data<{ id: string }>(manual).id;
      expect(
        (
          await call('post', '/terminals').send({
            provider: 'STONE',
            model: 'Stone Smart',
            label: 'Not implemented',
            mode: 'INTEGRATED',
            externalId: externalTerminalId,
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await call('post', '/terminals').send({
            provider: 'MERCADO_PAGO',
            model: 'Point Smart 2',
            label: 'Wrong device',
            mode: 'INTEGRATED',
            externalId: 'UNKNOWN_DEVICE',
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await call('post', '/terminals').send({
            provider: 'MERCADO_PAGO',
            model: 'Point Smart 2',
            label: 'Not PDV',
            mode: 'INTEGRATED',
            externalId: 'NOT_PDV',
          })
        ).status,
      ).toBe(400);
      const integrated = await call('post', '/terminals').send({
        provider: 'MERCADO_PAGO',
        model: 'Point Smart 2',
        label: 'Point card test',
        mode: 'INTEGRATED',
        externalId: externalTerminalId,
      });
      expect(integrated.status).toBe(201);
      terminalId = data<{ id: string }>(integrated).id;
    });
    it('reserves an order and terminal, rejects concurrent charges/manual payment/order cancellation', async () => {
      const sale = await order();
      const key = randomUUID();
      const body = { requestId: key, orderId: sale.id, terminalId };
      const response = await call('post', '/charges').send(body);
      expect(response.status).toBe(201);
      const created = data<{ id: string; externalId: string }>(response);
      expect(
        data<{ id: string }>(await call('post', '/charges').send(body)).id,
      ).toBe(created.id);
      expect(
        (
          await call('post', '/charges').send({
            ...body,
            requestId: randomUUID(),
          })
        ).status,
      ).toBe(409);
      const second = await order();
      expect(
        (
          await call('post', '/charges').send({
            requestId: randomUUID(),
            orderId: second.id,
            terminalId,
          })
        ).status,
      ).toBe(409);
      expect(
        (
          await request(app.getHttpServer() as Server)
            .post('/v1/operations/payments')
            .set('Cookie', cookies)
            .set('Origin', origin)
            .send({
              requestId: randomUUID(),
              financialTransactionId: sale.financialTransactions[0].id,
              amount: 10,
              methodName: 'CARTAO',
            })
        ).status,
      ).toBe(400);
      expect(
        (
          await request(app.getHttpServer() as Server)
            .patch(`/v1/orders/${sale.id}/status`)
            .set('Cookie', cookies)
            .set('Origin', origin)
            .send({ status: 'CANCELLED' })
        ).status,
      ).toBe(400);
      expect(
        (await call('post', '/connection/disconnect').send({})).status,
      ).toBe(409);
      expect(
        (await call('post', `/charges/${created.id}/cancel`).send({})).status,
      ).toBe(201);
      expect(
        (
          await db.terminalCharge.findUniqueOrThrow({
            where: { id: created.id },
          })
        ).status,
      ).toBe('CANCELLED');
    });
    it('rejects forged webhooks and settles repeated/concurrent valid notifications exactly once', async () => {
      const sale = await order();
      const created = await charge(sale.id);
      approve(created.externalId);
      expect((await notify(created.externalId, false)).status).toBe(401);
      expect(await db.payment.count({ where: { orderId: sale.id } })).toBe(0);
      const results = await Promise.all([
        notify(created.externalId),
        notify(created.externalId),
      ]);
      expect(results.map((result) => result.status)).toEqual([200, 200]);
      expect(await db.payment.count({ where: { orderId: sale.id } })).toBe(1);
      expect(
        (
          await db.financialTransaction.findUniqueOrThrow({
            where: { id: sale.financialTransactions[0].id },
          })
        ).status,
      ).toBe('PAID');
      expect(
        (await call('get', `/charges?orderId=${sale.id}`, sellerCookies))
          .status,
      ).toBe(403);
      expect(
        (
          await call('post', `/charges/${created.id}/sync`, sellerCookies).send(
            {},
          )
        ).status,
      ).toBe(403);
    });
    it('recovers a lost creation response using the original provider idempotency key', async () => {
      const sale = await order();
      loseCreateResponse = true;
      const body = { requestId: randomUUID(), orderId: sale.id, terminalId };
      expect((await call('post', '/charges').send(body)).status).toBe(503);
      const persisted = await db.terminalCharge.findUniqueOrThrow({
        where: { requestId: body.requestId },
      });
      expect(persisted.status).toBe('CREATING');
      const response = await call('post', `/charges/${persisted.id}/sync`).send(
        {},
      );
      expect(response.status).toBe(201);
      const recovered = data<{ externalId: string }>(response);
      expect(recovered.externalId).toBe(createKeys.get(body.requestId));
      approve(recovered.externalId);
      expect((await notify(recovered.externalId)).status).toBe(200);
      expect(await db.payment.count({ where: { orderId: sale.id } })).toBe(1);
    });
    it('records manual card payment with explicit confirmation, matching balance and receipt', async () => {
      const sale = await order();
      const body = {
        requestId: randomUUID(),
        orderId: sale.id,
        terminalId: manualTerminalId,
        nsu: 'TEST-NSU-123',
        confirmed: true,
        amount: 10,
      };
      expect(
        (await call('post', '/manual').send({ ...body, confirmed: false }))
          .status,
      ).toBe(400);
      expect(
        (await call('post', '/manual').send({ ...body, amount: 9 })).status,
      ).toBe(409);
      const response = await call('post', '/manual').send(body);
      expect(response.status).toBe(201);
      expect((await call('post', '/manual').send(body)).status).toBe(201);
      expect(
        await db.payment.count({
          where: { orderId: sale.id, terminalId: manualTerminalId },
        }),
      ).toBe(1);
      expect(
        data<{ amount: string }>(
          await call('get', `/balance?orderId=${sale.id}`),
        ).amount,
      ).toBe('0.00');
    });
    it('does not settle amount/recipient mismatches and preserves paid records on refund', async () => {
      const sale = await order();
      const created = await charge(sale.id);
      approve(created.externalId);
      remoteOrders.get(
        created.externalId,
      )!.transactions!.payments![0].paid_amount = '9.00';
      await notify(created.externalId);
      expect(
        (
          await db.terminalCharge.findUniqueOrThrow({
            where: { id: created.id },
          })
        ).status,
      ).toBe('REVIEW');
      expect(await db.payment.count({ where: { orderId: sale.id } })).toBe(0);
      approve(created.externalId);
      remoteOrders.get(created.externalId)!.user_id = 98765;
      await notify(created.externalId);
      expect(await db.payment.count({ where: { orderId: sale.id } })).toBe(0);
      remoteOrders.get(created.externalId)!.user_id = 12345;
      await notify(created.externalId);
      expect(await db.payment.count({ where: { orderId: sale.id } })).toBe(1);
      remoteOrders.get(created.externalId)!.status = 'refunded';
      remoteOrders.get(created.externalId)!.transactions!.payments![0].status =
        'refunded';
      await notify(created.externalId);
      expect(
        (
          await db.terminalCharge.findUniqueOrThrow({
            where: { id: created.id },
          })
        ).status,
      ).toBe('REVIEW');
      expect(await db.payment.count({ where: { orderId: sale.id } })).toBe(1);
      expect(
        (
          await db.paymentConnection.findUniqueOrThrow({
            where: { id: connectionId },
          })
        ).merchantId,
      ).toBe('12345');
      expect(otherId).not.toBe(adminId);
    });
  },
);
