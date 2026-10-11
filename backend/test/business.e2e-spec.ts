import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';

interface TestPayload {
  id: string;
  amount: string;
  copyPaste: string;
  qrCode: string;
  confirmation: string;
  accessToken?: string;
  seller: { passwordHash?: string };
}
const responseData = (response: request.Response): TestPayload =>
  (response.body as { data: TestPayload }).data;
import { hash } from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite('ERP business integration (disposable PostgreSQL)', () => {
  let app: INestApplication;
  let db: PrismaClient;
  let cookies: string[];
  let adminId: string;
  let clientId: string;
  let productId: string;
  let orderId: string;
  let titleId: string;
  const email = `test-${randomUUID()}@example.com`;
  const password = 'Test-password-123!';
  const origin = 'http://127.0.0.1:5188';
  const call = (method: 'get' | 'post' | 'patch', path: string) =>
    request(app.getHttpServer() as Server)
      [method](`/v1${path}`)
      .set('Cookie', cookies)
      .set('Origin', origin);
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.CORS_ORIGIN = origin;
    process.env.PIX_KEY = 'merchant@example.com';
    process.env.PIX_MERCHANT_NAME = 'Loja Teste';
    process.env.PIX_MERCHANT_CITY = 'SAO PAULO';
    db = new PrismaClient();
    const admin = await db.user.create({
      data: {
        name: 'Test admin',
        email,
        passwordHash: await hash(password, 4),
        role: 'admin',
      },
    });
    adminId = admin.id;
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    const login = await request(app.getHttpServer() as Server)
      .post('/v1/auth/login')
      .set('Origin', origin)
      .send({ email, password });
    expect(login.status).toBe(200);
    expect(responseData(login).accessToken).toBeUndefined();
    cookies = login.headers['set-cookie'] as unknown as string[];
    expect(cookies.every((cookie) => cookie.includes('HttpOnly'))).toBe(true);
  }, 30000);
  afterAll(async () => {
    await app?.close();
    await db?.$disconnect();
  });

  it('creates real client/product and receives a purchase only once', async () => {
    const client = await call('post', '/clients').send({
      tradeName: 'Cliente teste',
      legalName: 'Cliente teste',
      document: randomUUID().replace(/-/g, '').slice(0, 14),
      address: 'Rua teste',
    });
    expect(client.status).toBe(201);
    clientId = responseData(client).id;
    const product = await call('post', '/products').send({
      sku: randomUUID(),
      name: 'Produto teste',
      price: 10,
      cost: 5,
      minStock: 0,
      trackBatch: false,
    });
    expect(product.status).toBe(201);
    productId = responseData(product).id;
    const purchase = await call('post', '/operations/purchases').send({
      requestId: randomUUID(),
      supplierName: 'Fornecedor teste',
      receiveNow: false,
      items: [{ productId, quantity: 5, unitCost: 5 }],
    });
    expect(purchase.status).toBe(201);
    const id = responseData(purchase).id;
    const receive = await Promise.all([
      call('patch', `/operations/purchases/${id}/receive`).send({}),
      call('patch', `/operations/purchases/${id}/receive`).send({}),
    ]);
    expect(receive.map((res) => res.status)).toEqual([200, 200]);
    expect(
      await db.inventoryMovement.count({
        where: { productId, type: 'INBOUND' },
      }),
    ).toBe(1);
    expect(
      await db.financialTransaction.count({ where: { purchaseOrderId: id } }),
    ).toBe(1);
  });
  it('prevents overselling under concurrent requests and hides seller secrets', async () => {
    const responses = await Promise.all(
      [1, 2].map(() =>
        call('post', '/orders').send({
          requestId: randomUUID(),
          clientId,
          paymentMethod: 'PIX',
          items: [{ productId, quantity: 4 }],
        }),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([201, 400]);
    const order = responseData(responses.find((r) => r.status === 201)!);
    orderId = order.id;
    expect(order.seller.passwordHash).toBeUndefined();
    titleId = (
      await db.financialTransaction.findFirstOrThrow({ where: { orderId } })
    ).id;
  });
  it('generates a PIX without confirming payment', async () => {
    const response = await call('get', `/orders/${orderId}/pix`);
    expect(response.status).toBe(200);
    expect(responseData(response).amount).toBe('40.00');
    expect(responseData(response).copyPaste).toContain('merchant@example.com');
    expect(responseData(response).qrCode).toMatch(/^data:image\/png;base64,/);
    expect(responseData(response).confirmation).toBe('MANUAL');
    expect(await db.payment.count({ where: { orderId } })).toBe(0);
  });
  it('records partial payments idempotently and rejects overpayment', async () => {
    const payload = {
      requestId: randomUUID(),
      financialTransactionId: titleId,
      amount: 10,
      methodName: 'PIX',
    };
    expect(
      (await call('post', '/operations/payments').send(payload)).status,
    ).toBe(201);
    expect(
      (await call('post', '/operations/payments').send(payload)).status,
    ).toBe(201);
    expect(
      await db.payment.count({ where: { financialTransactionId: titleId } }),
    ).toBe(1);
    expect(
      (
        await db.financialTransaction.findUniqueOrThrow({
          where: { id: titleId },
        })
      ).status,
    ).toBe('PENDING');
    const pix = await call('get', `/orders/${orderId}/pix`);
    expect(responseData(pix).amount).toBe('30.00');
    expect(
      (
        await call('post', '/operations/payments').send({
          ...payload,
          requestId: randomUUID(),
          amount: 31,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call('patch', `/orders/${orderId}/status`).send({
          status: 'CANCELLED',
        })
      ).status,
    ).toBe(400);
  });
  it('rejects discounts beyond subtotal and restores unpaid cancellation once', async () => {
    const data = {
      requestId: randomUUID(),
      clientId,
      paymentMethod: 'PIX',
      items: [{ productId, quantity: 1 }],
    };
    expect(
      (await call('post', '/orders').send({ ...data, discountAmount: 11 }))
        .status,
    ).toBe(400);
    const created = await call('post', '/orders').send(data);
    expect(created.status).toBe(201);
    const id = responseData(created).id;
    expect(
      (
        await call('patch', `/orders/${id}/status`).send({
          status: 'CANCELLED',
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await call('patch', `/orders/${id}/status`).send({
          status: 'CANCELLED',
        })
      ).status,
    ).toBe(200);
    expect(
      await db.inventoryMovement.count({
        where: { reason: `Cancelamento ${id}` },
      }),
    ).toBe(1);
    expect(
      (
        await db.financialTransaction.findFirstOrThrow({
          where: { orderId: id },
        })
      ).status,
    ).toBe('CANCELLED');
  });
  it('rejects a cookie-authenticated mutation from an untrusted origin', async () => {
    const res = await request(app.getHttpServer() as Server)
      .post('/v1/operations/cash-sessions')
      .set('Cookie', cookies)
      .set('Origin', 'https://untrusted.example')
      .send({ openingBalance: 0 });
    expect(res.status).toBe(403);
  });
  it('posts a cash sale atomically and reconciles the cash closing', async () => {
    const sale = {
      requestId: randomUUID(),
      clientId,
      paymentMethod: 'DINHEIRO',
      items: [{ productId, quantity: 1 }],
    };
    expect((await call('post', '/orders').send(sale)).status).toBe(400);
    const opened = await call('post', '/operations/cash-sessions').send({
      openingBalance: 20,
    });
    expect(opened.status).toBe(201);
    const cashId = responseData(opened).id;
    expect(
      (
        await call('post', '/operations/cash-sessions').send({
          openingBalance: 0,
        })
      ).status,
    ).toBe(400);
    const sold = await call('post', '/orders').send(sale);
    expect(sold.status).toBe(201);
    expect((await call('post', '/orders').send(sale)).status).toBe(201);
    const id = responseData(sold).id;
    expect(await db.payment.count({ where: { orderId: id } })).toBe(1);
    expect(
      (
        await db.financialTransaction.findFirstOrThrow({
          where: { orderId: id },
        })
      ).status,
    ).toBe('PAID');
    expect(
      (
        await call('patch', `/operations/cash-sessions/${cashId}/close`).send({
          closingBalance: 29,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call('patch', `/operations/cash-sessions/${cashId}/close`).send({
          closingBalance: 30,
        })
      ).status,
    ).toBe(200);
  });
  it('protects linked titles and enforces role permissions', async () => {
    expect(
      (
        await call('patch', `/financial/transactions/${titleId}`).send({
          amount: 1,
        })
      ).status,
    ).toBe(400);
    const cashier = await db.user.create({
      data: {
        name: 'Cashier test',
        email: `cash-${randomUUID()}@example.com`,
        passwordHash: await hash(password, 4),
        role: 'caixa',
      },
    });
    const login = await request(app.getHttpServer() as Server)
      .post('/v1/auth/login')
      .set('Origin', origin)
      .send({ email: cashier.email, password });
    expect(login.status).toBe(200);
    const cashierCookies = login.headers['set-cookie'] as unknown as string[];
    expect(
      (
        await request(app.getHttpServer() as Server)
          .get('/v1/users')
          .set('Cookie', cashierCookies)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app.getHttpServer() as Server)
          .get('/v1/orders')
          .set('Cookie', cashierCookies)
      ).status,
    ).toBe(200);
  });
  it('restricts delivery transitions to its assigned driver and synchronizes orders', async () => {
    const driver = await db.user.create({
      data: {
        name: 'Driver test',
        email: `driver-${randomUUID()}@example.com`,
        passwordHash: await hash(password, 4),
        role: 'entregador',
      },
    });
    const assigned = await call('post', '/deliveries/assign').send({
      orderId,
      deliveryPersonId: driver.id,
    });
    expect(assigned.status).toBe(201);
    const deliveryId = responseData(assigned).id;
    const login = await request(app.getHttpServer() as Server)
      .post('/v1/auth/login')
      .set('Origin', origin)
      .send({ email: driver.email, password });
    expect(login.status).toBe(200);
    const driverCookies = login.headers['set-cookie'] as unknown as string[];
    const driverPatch = (path: string, status: string) =>
      request(app.getHttpServer() as Server)
        .patch(`/v1${path}`)
        .set('Cookie', driverCookies)
        .set('Origin', origin)
        .send({ status });
    expect(
      (await driverPatch(`/orders/${orderId}/status`, 'CANCELLED')).status,
    ).toBe(403);
    expect(
      (await driverPatch(`/deliveries/${deliveryId}/status`, 'DELIVERED'))
        .status,
    ).toBe(400);
    expect(
      (await driverPatch(`/deliveries/${deliveryId}/status`, 'IN_ROUTE'))
        .status,
    ).toBe(200);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: orderId } })).status,
    ).toBe('DELIVERING');
    expect(
      (await driverPatch(`/deliveries/${deliveryId}/status`, 'DELIVERED'))
        .status,
    ).toBe(200);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: orderId } })).status,
    ).toBe('COMPLETED');
  });
  it('keeps fiscal records internal and prevents fake authorization or order rebinding', async () => {
    const created = await call('post', '/invoices').send({ orderId });
    expect(created.status).toBe(201);
    const invoiceId = responseData(created).id;
    expect((await call('post', '/invoices').send({ orderId })).status).toBe(
      201,
    );
    expect(await db.invoice.count({ where: { orderId } })).toBe(1);
    expect(
      (
        await call('patch', `/invoices/${invoiceId}`).send({
          status: 'AUTHORIZED',
        })
      ).status,
    ).toBe(400);
    expect(
      (await call('patch', `/invoices/${invoiceId}`).send({ orderId })).status,
    ).toBe(400);
    const cancelled = await db.order.findFirstOrThrow({
      where: { sellerId: adminId, status: 'CANCELLED' },
    });
    expect(
      (await call('post', '/invoices').send({ orderId: cancelled.id })).status,
    ).toBe(400);
  });
  it('rotates refresh tokens and rejects reuse and untrusted login origins', async () => {
    expect(
      (
        await request(app.getHttpServer() as Server)
          .post('/v1/auth/login')
          .set('Origin', 'https://untrusted.example')
          .send({ email, password })
      ).status,
    ).toBe(403);
    const old = cookies;
    const refreshed = await call('post', '/auth/refresh').send({});
    expect(refreshed.status).toBe(200);
    cookies = refreshed.headers['set-cookie'] as unknown as string[];
    expect(
      (
        await request(app.getHttpServer() as Server)
          .post('/v1/auth/refresh')
          .set('Cookie', old)
          .set('Origin', origin)
          .send({})
      ).status,
    ).toBe(401);
    expect((await call('get', '/auth/me')).status).toBe(200);
  });
  it('prevents administrators from accidentally disabling their own access', async () => {
    expect(
      (await call('patch', `/users/${adminId}`).send({ isActive: false }))
        .status,
    ).toBe(400);
    expect(
      (await call('patch', `/users/${adminId}`).send({ role: 'caixa' })).status,
    ).toBe(400);
  });
  it('invalidates access and refresh when a user is deactivated', async () => {
    await db.user.update({ where: { id: adminId }, data: { isActive: false } });
    expect((await call('get', '/auth/me')).status).toBe(401);
    expect((await call('post', '/auth/refresh').send({})).status).toBe(401);
  });
});
