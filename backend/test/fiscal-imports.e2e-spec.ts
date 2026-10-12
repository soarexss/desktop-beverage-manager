import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { nfeFixture, RECIPIENT_CNPJ } from './fixtures/nfe.fixture';

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite('Company, Pix and inbound XML (disposable PostgreSQL)', () => {
  let app: INestApplication, db: PrismaClient;
  let cookies: string[], sellerCookies: string[];
  let adminId: string, clientId: string, productId: string, companyId: string;
  let previousCompanyId: string | undefined;
  const origin = 'https://fiscal.test';
  const email = `fiscal-${randomUUID()}@example.com`;
  const password = 'Disposable-fiscal-test-password!';
  const number = Math.floor(Math.random() * 900000000) + 10000;
  const note = nfeFixture(number);
  let importedPurchaseId: string;
  const configuration = {
    legalName: 'Empresa fiscal de teste',
    tradeName: 'Loja de teste',
    document: RECIPIENT_CNPJ,
    stateRegistration: 'CFDF-TEST',
    municipalRegistration: '',
    taxRegime: 'MEI',
    primaryCnae: '4635401',
    secondaryCnaes: [],
    address: 'Endereço de teste descartável',
    city: 'Brasília',
    state: 'DF',
    municipalityCode: '5300108',
    postalCode: '70040909',
    pixEnabled: true,
    pixKey: 'fiscal-merchant@example.com',
    pixMerchantName: 'Loja fiscal',
    pixMerchantCity: 'BRASILIA',
  };
  const call = (
    method: 'get' | 'put' | 'post' | 'patch',
    path: string,
    auth = cookies,
  ) =>
    request(app.getHttpServer() as Server)
      [method](`/v1${path}`)
      .set('Origin', origin)
      .set('Cookie', auth);
  function data<T>(response: request.Response) {
    return (response.body as { data: T }).data;
  }
  const payload = (xmlContent = note.xml, sku?: string) => ({
    xmlContent,
    requestId: randomUUID(),
    authenticityChecked: true,
    dueDate: '2026-11-15T12:00:00-03:00',
    items: [
      {
        line: 1,
        stockFactor: 12,
        ...(sku
          ? { newSku: sku, salePrice: 2, stockUnit: 'UN' }
          : { productId }),
      },
    ],
  });
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.CORS_ORIGIN = origin;
    process.env.THROTTLE_LIMIT = '10000';
    db = new PrismaClient();
    const previous = await db.company.findUnique({
      where: { operationalKey: 'PRIMARY' },
    });
    previousCompanyId = previous?.id;
    if (previous)
      await db.company.update({
        where: { id: previous.id },
        data: { operationalKey: null },
      });
    const admin = await db.user.create({
      data: {
        name: 'Fiscal test admin',
        email,
        role: 'admin',
        passwordHash: await hash(password, 4),
      },
    });
    adminId = admin.id;
    await db.user.create({
      data: {
        name: 'Fiscal test seller',
        email: `seller-${email}`,
        role: 'vendedor',
        passwordHash: await hash(password, 4),
      },
    });
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    const login = async (loginEmail: string) => {
      const response = await request(app.getHttpServer() as Server)
        .post('/v1/auth/login')
        .set('Origin', origin)
        .send({ email: loginEmail, password });
      expect(response.status).toBe(200);
      return response.headers['set-cookie'] as unknown as string[];
    };
    cookies = await login(email);
    sellerCookies = await login(`seller-${email}`);
    clientId = (
      await db.client.create({
        data: {
          tradeName: 'Cliente teste fiscal',
          legalName: 'Cliente teste',
          document: randomUUID().replaceAll('-', '').slice(0, 14),
          address: 'Endereço teste',
          createdById: adminId,
        },
      })
    ).id;
    productId = (
      await db.product.create({
        data: {
          name: 'Produto fiscal existente',
          sku: randomUUID(),
          price: 2,
          cost: 1,
          minStock: 0,
        },
      })
    ).id;
  }, 30000);
  afterAll(async () => {
    if (companyId)
      await db.company.update({
        where: { id: companyId },
        data: { operationalKey: null },
      });
    if (previousCompanyId)
      await db.company.update({
        where: { id: previousCompanyId },
        data: { operationalKey: 'PRIMARY' },
      });
    await app?.close();
    await db?.$disconnect();
  });

  it('requires session/admin and rejects malformed company data', async () => {
    expect(
      (await request(app.getHttpServer() as Server).get('/v1/company-profile'))
        .status,
    ).toBe(401);
    expect(
      (await call('put', '/company-profile', sellerCookies).send(configuration))
        .status,
    ).toBe(403);
    expect(
      (
        await call('put', '/company-profile').send({
          ...configuration,
          document: '12345678000196',
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call('put', '/company-profile').send({
          ...configuration,
          primaryCnae: '1',
        })
      ).status,
    ).toBe(400);
    const response = await call('put', '/company-profile').send(configuration);
    expect(response.status).toBe(200);
    companyId = data<{ id: string }>(response).id;
    expect(
      data<{ crt: string; fiscalEmissionEnabled: boolean }>(response),
    ).toMatchObject({ crt: '4', fiscalEmissionEnabled: false });
  });
  it('supports separate regimes without pretending to calculate taxes', async () => {
    for (const [regime, crt] of [
      ['SIMPLES_NACIONAL', '1'],
      ['LUCRO_PRESUMIDO', '3'],
      ['LUCRO_REAL', '3'],
    ]) {
      const response = await call('put', '/company-profile').send({
        ...configuration,
        taxRegime: regime,
      });
      expect(response.status).toBe(200);
      expect(data<{ crt: string }>(response).crt).toBe(crt);
    }
  });
  it('uses the configured Pix key and respects disabling it', async () => {
    const order = await db.order.create({
      data: {
        clientId,
        sellerId: adminId,
        status: 'CONFIRMED',
        totalAmount: 10,
        financialTransactions: {
          create: {
            createdById: adminId,
            type: 'RECEIVABLE',
            amount: 10,
            description: 'Teste Pix empresa',
            dueDate: new Date(),
          },
        },
      },
    });
    const response = await call('get', `/orders/${order.id}/pix`);
    expect(response.status).toBe(200);
    expect(data<{ copyPaste: string }>(response).copyPaste).toContain(
      configuration.pixKey,
    );
    await call('put', '/company-profile').send({
      ...configuration,
      pixEnabled: false,
    });
    expect((await call('get', `/orders/${order.id}/pix`)).status).toBe(503);
    await call('put', '/company-profile').send(configuration);
    expect(await db.payment.count({ where: { orderId: order.id } })).toBe(0);
  });
  it('rejects unauthorized import, another recipient, DTD and missing operator confirmation', async () => {
    expect(
      (
        await call('post', '/fiscal-imports/preview', sellerCookies).send({
          xmlContent: note.xml,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call('post', '/fiscal-imports/preview').send({
          xmlContent: nfeFixture(number, '11222333000181').xml,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call('post', '/fiscal-imports/preview').send({
          xmlContent: '<!DOCTYPE note><note/>',
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call('post', '/fiscal-imports').send({
          ...payload(),
          authenticityChecked: false,
        })
      ).status,
    ).toBe(400);
    const preview = await call('post', '/fiscal-imports/preview').send({
      xmlContent: note.xml,
    });
    expect(preview.status).toBe(201);
    expect(
      data<{ authenticity: string; totalAmount: string }>(preview),
    ).toMatchObject({ authenticity: 'NOT_VERIFIED', totalAmount: '28.00' });
  });
  it('imports once under concurrency, then receives once with exact payable and stock conversion', async () => {
    const body = payload();
    const results = await Promise.all([
      call('post', '/fiscal-imports').send(body),
      call('post', '/fiscal-imports').send(body),
    ]);
    expect(results.map((response) => response.status)).toEqual([201, 201]);
    importedPurchaseId = data<{ purchaseOrderId: string }>(
      results[0],
    ).purchaseOrderId;
    expect(data<{ purchaseOrderId: string }>(results[1]).purchaseOrderId).toBe(
      importedPurchaseId,
    );
    expect(
      await db.fiscalImport.count({ where: { accessKey: note.key } }),
    ).toBe(1);
    const before = await db.purchaseOrder.findUniqueOrThrow({
      where: { id: importedPurchaseId },
      include: { items: true, financialTransaction: true },
    });
    expect(before.status).toBe('DRAFT');
    expect(before.financialTransaction).toBeNull();
    expect(before.items[0].quantity.toString()).toBe('24');
    expect(before.items[0].unitCost.toString()).toBe('1');
    expect(await db.inventoryMovement.count({ where: { productId } })).toBe(0);
    const receives = await Promise.all([
      call('patch', `/operations/purchases/${importedPurchaseId}/receive`),
      call('patch', `/operations/purchases/${importedPurchaseId}/receive`),
    ]);
    expect(receives.map((response) => response.status)).toEqual([200, 200]);
    expect(
      await db.inventoryMovement.count({
        where: { productId, type: 'INBOUND' },
      }),
    ).toBe(1);
    const title = await db.financialTransaction.findUniqueOrThrow({
      where: { purchaseOrderId: importedPurchaseId },
    });
    expect(title.amount.toString()).toBe('28');
    expect(title.type).toBe('PAYABLE');
    expect(title.status).toBe('PENDING');
    expect(title.dueDate.toISOString()).toBe('2026-11-15T15:00:00.000Z');
    expect(
      await db.payment.count({ where: { financialTransactionId: title.id } }),
    ).toBe(0);
  });
  it('accepts a bounded XML above the old JSON limit and requires a literal confirmation', async () => {
    const expanded = note.xml.replace(
      '<NFe>',
      `<!--${'x'.repeat(130000)}--><NFe>`,
    );
    expect(
      (
        await call('post', '/fiscal-imports/preview').send({
          xmlContent: expanded,
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await call('post', '/fiscal-imports/preview').send({
          xmlContent: 'x'.repeat(524289),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call('post', '/fiscal-imports').send({
          ...payload(),
          authenticityChecked: 'false',
        })
      ).status,
    ).toBe(400);
  });
  it('prevents double entry across concurrent manual purchase and XML import', async () => {
    const another = nfeFixture(number + 2);
    const results = await Promise.all([
      call('post', '/fiscal-imports').send(payload(another.xml)),
      call('post', '/operations/purchases').send({
        requestId: randomUUID(),
        supplierName: 'Compra concorrente de teste',
        accessKey: another.key,
        receiveNow: false,
        items: [{ productId, quantity: 2, unitCost: 12 }],
      }),
    ]);
    expect(results.filter((response) => response.status === 201)).toHaveLength(
      1,
    );
    expect(
      results.every((response) => [201, 400, 409].includes(response.status)),
    ).toBe(true);
    expect(
      await db.purchaseOrder.count({ where: { accessKey: another.key } }),
    ).toBe(1);
  });
  it('preserves XML, protects company identity and blocks manual double entry', async () => {
    const download = await call(
      'get',
      `/fiscal-imports/${importedPurchaseId}/xml`,
    );
    expect(download.status).toBe(200);
    expect(data<{ xmlContent: string }>(download).xmlContent).toBe(note.xml);
    expect(
      (
        await call(
          'get',
          `/fiscal-imports/${importedPurchaseId}/xml`,
          sellerCookies,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await call('put', '/company-profile').send({
          ...configuration,
          document: '11222333000181',
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call('post', '/operations/purchases').send({
          requestId: randomUUID(),
          supplierName: 'Mesmo fornecedor',
          accessKey: note.key,
          items: [{ productId, quantity: 1, unitCost: 1 }],
          receiveNow: true,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call('post', '/fiscal-imports').send(
          payload(note.xml.replace('Fornecedor de teste', 'Outro nome')),
        )
      ).status,
    ).toBe(409);
  });
  it('catalogs an unknown product explicitly and rolls back invalid mappings', async () => {
    const another = nfeFixture(number + 1);
    const sku = `XML-${randomUUID()}`;
    const body = payload(another.xml, sku);
    const invalid = {
      ...body,
      items: [{ ...body.items[0], stockFactor: 0.000001 }],
    };
    expect((await call('post', '/fiscal-imports').send(invalid)).status).toBe(
      400,
    );
    expect(
      await db.fiscalImport.count({ where: { accessKey: another.key } }),
    ).toBe(0);
    expect(await db.product.count({ where: { sku } })).toBe(0);
    const response = await call('post', '/fiscal-imports').send(body);
    expect(response.status).toBe(201);
    const product = await db.product.findUniqueOrThrow({ where: { sku } });
    expect(product.ncmId).toBeTruthy();
    expect(product.unitId).toBeTruthy();
    expect(product.cfopId).toBeNull();
    expect(product.price.toString()).toBe('2');
    expect(
      await db.inventoryMovement.count({ where: { productId: product.id } }),
    ).toBe(0);
  });
});
