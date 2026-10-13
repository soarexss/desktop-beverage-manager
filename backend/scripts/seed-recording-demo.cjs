// Real persisted operations in a dedicated demo database. Never use a customer's database.
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcrypt');
const { randomUUID } = require('node:crypto');

async function main() {
  const database = new URL(process.env.DATABASE_URL ?? '');
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.ALLOW_DEMO_SEED !== 'true' ||
    !/^\/erp_demo_[a-z0-9_]+$/.test(database.pathname) ||
    !['localhost', '127.0.0.1'].includes(database.hostname)
  )
    throw new Error(
      'Use somente um PostgreSQL local erp_demo_* e ALLOW_DEMO_SEED=true',
    );
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error(
      'Defina ADMIN_EMAIL e ADMIN_PASSWORD exclusivos da demonstração',
    );
  const origin = process.env.DEMO_WEB_ORIGIN || 'http://127.0.0.1:5188';
  const base = process.env.DEMO_API_URL || 'http://127.0.0.1:3001/v1';
  const demoApi = new URL(base);
  if (
    demoApi.protocol !== 'http:' ||
    demoApi.hostname !== '127.0.0.1' ||
    demoApi.username ||
    demoApi.password ||
    demoApi.pathname !== '/v1' ||
    demoApi.search ||
    demoApi.hash
  )
    throw new Error(
      'A API de gravação deve ser local, sem credenciais na URL e com prefixo /v1',
    );
  const db = new PrismaClient();
  try {
    const admin = await db.user.upsert({
      where: { email },
      create: {
        name: 'Administrador Demo',
        email,
        passwordHash: await hash(password, 12),
        role: 'admin',
      },
      update: {},
    });
    const driver = await db.user.upsert({
      where: { email: 'entregador@distribev.local' },
      create: {
        name: 'Lucas · Entregador Demo',
        email: 'entregador@distribev.local',
        passwordHash: await hash(password, 12),
        role: 'entregador',
      },
      update: {},
    });
    let cookies = [];
    async function api(path, method = 'GET', data) {
      const response = await fetch(base + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Origin: origin,
          Cookie: cookies.join('; '),
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
        signal: AbortSignal.timeout(20000),
        redirect: 'error',
      });
      if (response.headers.getSetCookie().length)
        cookies = response.headers
          .getSetCookie()
          .map((cookie) => cookie.split(';')[0]);
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          `${method} ${path}: ${payload.error?.message ?? response.status}`,
        );
      return payload.data;
    }
    await api('/auth/login', 'POST', { email, password });
    await api('/company-profile', 'PUT', {
      legalName: 'DistriBev Demonstração LTDA',
      tradeName: 'DistriBev · Demonstração',
      document: '12345678000195',
      stateRegistration: 'DEMONSTRACAO',
      municipalRegistration: '',
      taxRegime: 'SIMPLES_NACIONAL',
      primaryCnae: '4635401',
      secondaryCnaes: [],
      address: 'Endereço fictício · Brasília, DF',
      city: 'Brasília',
      state: 'DF',
      municipalityCode: '5300108',
      postalCode: '70040909',
      pixEnabled: true,
      pixKey: 'demonstracao-nao-pagar@example.com',
      pixMerchantName: 'DEMONSTRACAO NAO PAGAR',
      pixMerchantCity: 'BRASILIA',
    });
    const products = [
      ['DEMO-AGUA', 'Água mineral 500 ml', 2.5, 1.2, 30],
      ['DEMO-COLA', 'Refrigerante cola 2 L', 10, 6.5, 20],
      ['DEMO-CERVEJA', 'Cerveja lata 350 ml', 5.5, 3.2, 48],
      ['DEMO-SUCO', 'Suco integral 1 L', 14.9, 9, 12],
      ['DEMO-ENERGETICO', 'Energético lata 269 ml', 9.5, 5.8, 24],
      ['DEMO-GELO', 'Gelo filtrado 5 kg', 12, 6, 10],
      ['DEMO-TONICA', 'Água tônica 350 ml', 4.5, 2.5, 12],
      ['DEMO-GUARANA', 'Refrigerante guaraná 2 L', 9.5, 6, 18],
    ];
    const saved = [];
    for (const [sku, name, price, cost, minStock] of products)
      saved.push(
        (await db.product.findUnique({ where: { sku } })) ||
          (await api('/products', 'POST', {
            sku,
            name,
            price,
            cost,
            minStock,
            trackBatch: false,
          })),
      );
    const supplier = await db.registryEntry.upsert({
      where: { type_code: { type: 'SUPPLIER', code: 'DEMO-FORNECEDOR' } },
      create: {
        type: 'SUPPLIER',
        code: 'DEMO-FORNECEDOR',
        name: 'Fornecedor Demo · Dados fictícios',
      },
      update: {},
    });
    if (
      !(await db.purchaseOrder.findFirst({
        where: { invoiceNumber: 'DEMO-ENTRADA-001' },
      }))
    )
      await api('/operations/purchases', 'POST', {
        requestId: randomUUID(),
        supplierId: supplier.id,
        supplierName: supplier.name,
        invoiceNumber: 'DEMO-ENTRADA-001',
        receiveNow: true,
        items: saved.map((product, index) => ({
          productId: product.id,
          quantity: index === 6 ? 8 : 180,
          unitCost: products[index][3],
        })),
      });
    if (
      !(await db.purchaseOrder.findFirst({
        where: { invoiceNumber: 'DEMO-ENCOMENDA-002' },
      }))
    )
      await api('/operations/purchases', 'POST', {
        requestId: randomUUID(),
        supplierId: supplier.id,
        supplierName: supplier.name,
        invoiceNumber: 'DEMO-ENCOMENDA-002',
        receiveNow: false,
        items: [{ productId: saved[0].id, quantity: 60, unitCost: 1.2 }],
      });
    const clients = [];
    for (const [index, name] of [
      'Mercadinho da Praça · Demo',
      'Restaurante Sabor do DF · Demo',
      'Conveniência Central · Demo',
      'Lanchonete do Parque · Demo',
    ].entries()) {
      const document = `DEMO-CLIENTE-00${index + 1}`;
      clients.push(
        (await db.client.findUnique({ where: { document } })) ||
          (await api('/clients', 'POST', {
            tradeName: name,
            legalName: name,
            document,
            address: 'Endereço fictício de demonstração · Brasília, DF',
            phone: '(61) 0000-0000',
          })),
      );
    }
    for (let index = 0; index < 7; index++) {
      const marker = `[DEMO-GRAVACAO-${index + 1}]`;
      let order = await db.order.findFirst({ where: { notes: marker } });
      if (!order)
        order = await api('/orders', 'POST', {
          requestId: randomUUID(),
          clientId: clients[index % clients.length].id,
          paymentMethod: index % 2 ? 'PRAZO' : 'PIX',
          notes: marker,
          items: [
            { productId: saved[index % 5].id, quantity: 4 + index },
            { productId: saved[(index + 1) % 5].id, quantity: 2 },
          ],
        });
      if (
        [1, 4].includes(index) &&
        !(await db.delivery.findUnique({ where: { orderId: order.id } }))
      )
        await api('/deliveries/assign', 'POST', {
          orderId: order.id,
          deliveryPersonId: driver.id,
          notes: 'Entrega fictícia para gravação',
        });
      if (index === 0) {
        const title = await db.financialTransaction.findFirst({
          where: { orderId: order.id },
        });
        if (title && title.status !== 'PAID')
          await api('/operations/payments', 'POST', {
            requestId: randomUUID(),
            financialTransactionId: title.id,
            orderId: order.id,
            methodName: 'PIX',
            amount: Number(title.amount),
            nsu: 'DEMO-SEM-PAGAMENTO-REAL',
          });
      }
    }
    console.log(
      `Demonstração preparada: ${saved.length} produtos, ${clients.length} clientes, 7 pedidos, compras e entregas. Dados fictícios, nenhum pagamento bancário real. Administrador: ${admin.email}`,
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
