const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcrypt");

const prisma = new PrismaClient();

const registrySeeds = [
  ["ESTABLISHMENT", "MATRIZ", "Distribuidora Sol Bebidas LTDA", "Estabelecimento principal", { document: "12.345.678/0001-90" }],
  ["OPERATION_NATURE", "5102", "Venda de mercadoria adquirida de terceiros", "Natureza padrao de saida", { cfop: "5102" }],
  ["TAX_CATEGORY", "ICMS-ST", "ICMS com substituicao tributaria", "Categoria fiscal para bebidas", { tax: "ICMS" }],
  ["TAX_RULE", "BEB-SP", "Regra bebidas SP", "Aliquotas e reducoes por UF", { uf: "SP", icms: 18, pis: 1.65, cofins: 7.6 }],
  ["SUPPLIER", "AMB", "Ambev S/A", "Fornecedor de cervejas", { document: "07.526.557/0001-00" }],
  ["SUPPLIER", "COCA", "Coca-Cola FEMSA", "Fornecedor de refrigerantes", { document: "43.776.517/0001-80" }],
  ["SELLER", "VEN-001", "Joao Almeida", "Vendedor interno", { commission: 2.5 }],
  ["PAYMENT_METHOD", "PIX", "PIX", "Pagamento instantaneo", { settlementDays: 0 }],
  ["PAYMENT_METHOD", "BOLETO", "Boleto", "Venda faturada", { settlementDays: 3 }],
  ["PAYMENT_METHOD", "CARD", "Cartao credito/debito", "TEF/cartao", { tef: true }],
  ["CITY", "SAO-SP", "Sao Paulo/SP", "Cidade atendida", { state: "SP" }],
  ["CITY", "GUA-SP", "Guarulhos/SP", "Cidade atendida", { state: "SP" }],
  ["ACTIVITY_PROFILE", "BAR", "Bar e restaurante", "Perfil de cliente", {}],
  ["BRAND", "SKOL", "Skol", "Marca de cerveja", {}],
  ["BRAND", "COCA", "Coca-Cola", "Marca de refrigerante", {}],
  ["UNIT", "UN", "Unidade", "Unidade individual", {}],
  ["UNIT", "CX12", "Caixa 12 unidades", "Unidade caixa", { units: 12 }],
  ["SECTION", "BEB", "Bebidas", "Secao principal", {}],
  ["PRODUCT_GROUP", "CERV", "Cervejas", "Grupo de mercadorias", {}],
  ["PRODUCT_GROUP", "REFRI", "Refrigerantes", "Grupo de mercadorias", {}],
  ["PRODUCT_SUBGROUP", "LATA", "Latas", "Subgrupo de embalagem", {}],
  ["ICMS_ISS_CALC_FUNCTION", "ICMS-ST-BEB", "Calculo ICMS-ST bebidas", "Funcao fiscal", { formula: "base * aliquota" }],
  ["COMPLEMENT_SUBSTANCE", "ALC", "Bebida alcoolica", "Classificacao complementar", {}],
  ["PROJECT", "PDV", "Carga PDV", "Projeto de integracao PDV", {}],
  ["PLATFORM", "IFOOD", "iFood/catalogo digital", "Plataforma de catalogo", {}],
  ["NCM_CODE", "22030000", "Cervejas de malte", "Codigo NCM", {}],
  ["NCM_CODE", "22021000", "Aguas/refrigerantes", "Codigo NCM", {}],
  ["CFOP_CODE", "5102", "Venda dentro do estado", "Codigo fiscal", {}],
  ["FREIGHT_TABLE", "SP-CAP", "Frete Sao Paulo Capital", "Tabela de fretes", { base: 25 }],
  ["CARRIER", "ENT-PROPRIA", "Frota propria", "Transportadora interna", {}],
  ["VEHICLE", "VW-1234", "Van VW Delivery", "Veiculo de entrega", { plate: "VW-1234" }],
];

async function main() {
  const passwordHash = await hash("admin1234", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@distribev.local" },
    update: { passwordHash, role: "admin", isActive: true },
    create: {
      name: "Administrador DistriBev",
      email: "admin@distribev.local",
      passwordHash,
      role: "admin",
      isActive: true,
    },
  });

  await prisma.company.upsert({
    where: { document: "12.345.678/0001-90" },
    update: {},
    create: {
      legalName: "Distribuidora Sol Bebidas LTDA",
      tradeName: "DistriBev",
      document: "12.345.678/0001-90",
      stateRegistration: "123.456.789.012",
      taxRegime: "Lucro Presumido",
      email: "contato@distribev.local",
      phone: "(11) 3000-0000",
      city: "Sao Paulo",
      state: "SP",
      branches: {
        create: {
          code: "MATRIZ",
          name: "Matriz",
          city: "Sao Paulo",
          state: "SP",
          fiscalSeries: { nfe: "1", nfce: "1" },
        },
      },
    },
  });

  for (const [type, code, name, description, metadata] of registrySeeds) {
    await prisma.registryEntry.upsert({
      where: { type_code: { type, code } },
      update: { name, description, metadata },
      create: { type, code, name, description, metadata },
    });
  }

  const brand = await prisma.registryEntry.findFirst({ where: { type: "BRAND", code: "SKOL" } });
  const unit = await prisma.registryEntry.findFirst({ where: { type: "UNIT", code: "UN" } });
  const group = await prisma.registryEntry.findFirst({ where: { type: "PRODUCT_GROUP", code: "CERV" } });
  const ncm = await prisma.registryEntry.findFirst({ where: { type: "NCM_CODE", code: "22030000" } });
  const cfop = await prisma.registryEntry.findFirst({ where: { type: "CFOP_CODE", code: "5102" } });

  const product = await prisma.product.upsert({
    where: { sku: "7891991010023" },
    update: {},
    create: {
      sku: "7891991010023",
      barcode: "7891991010023",
      name: "Cerveja Skol Lata 350ml",
      description: "Caixa com 12 unidades",
      brandId: brand?.id,
      unitId: unit?.id,
      groupId: group?.id,
      ncmId: ncm?.id,
      cfopId: cfop?.id,
      price: 3.49,
      cost: 2.49,
      minStock: 50,
      maxStock: 5000,
      trackBatch: true,
    },
  });

  await prisma.productBarcode.createMany({
    data: [
      {
        productId: product.id,
        code: "17891991010020",
        type: "DUN14",
        source: "Caixa fechada",
      },
      {
        productId: product.id,
        code: "7891991010023-UN",
        type: "INTERNO",
        source: "Coletor",
      },
    ],
    skipDuplicates: true,
  });

  const hasInitialStock = await prisma.inventoryMovement.count({
    where: { productId: product.id, reason: "Carga inicial" },
  });

  if (!hasInitialStock) {
    await prisma.inventoryMovement.create({
      data: {
        productId: product.id,
        type: "INBOUND",
        quantity: 240,
        unitCost: 2.49,
        batchNumber: "SEED-001",
        expiresAt: new Date("2026-12-31"),
        reason: "Carga inicial",
        createdById: admin.id,
      },
    });
  }

  const client = await prisma.client.upsert({
    where: { document: "11.234.567/0001-89" },
    update: {},
    create: {
      tradeName: "Bar do Ze",
      legalName: "Bar do Ze Comercio LTDA",
      document: "11.234.567/0001-89",
      email: "contato@bardoze.local",
      phone: "(11) 98765-4321",
      address: "R. Augusta, 1240 - Sao Paulo/SP",
      creditLimit: 5000,
      createdById: admin.id,
    },
  });

  const revenueAccount = await prisma.chartAccount.upsert({
    where: { code: "1.01" },
    update: { name: "Venda de mercadorias", type: "RECEIVABLE" },
    create: {
      code: "1.01",
      name: "Venda de mercadorias",
      type: "RECEIVABLE",
    },
  });

  const supplierAccount = await prisma.chartAccount.upsert({
    where: { code: "2.01" },
    update: { name: "Compra de mercadorias", type: "PAYABLE" },
    create: {
      code: "2.01",
      name: "Compra de mercadorias",
      type: "PAYABLE",
    },
  });

  const taxAccount = await prisma.chartAccount.upsert({
    where: { code: "2.02" },
    update: { name: "Impostos e taxas", type: "PAYABLE" },
    create: {
      code: "2.02",
      name: "Impostos e taxas",
      type: "PAYABLE",
    },
  });

  const salesCostCenter = await prisma.costCenter.upsert({
    where: { code: "COM" },
    update: { name: "Comercial" },
    create: {
      code: "COM",
      name: "Comercial",
    },
  });

  const logisticsCostCenter = await prisma.costCenter.upsert({
    where: { code: "LOG" },
    update: { name: "Logistica" },
    create: {
      code: "LOG",
      name: "Logistica",
    },
  });

  await prisma.priceTable.upsert({
    where: { code: "PADRAO" },
    update: {},
    create: {
      code: "PADRAO",
      name: "Tabela Padrao",
      isDefault: true,
      items: {
        create: {
          productId: product.id,
          price: 3.49,
        },
      },
    },
  });

  const bankAccount = await prisma.bankAccount.upsert({
    where: { id: "seed-bank-main" },
    update: {},
    create: {
      id: "seed-bank-main",
      name: "Conta Operacional",
      bankName: "Banco ERP",
      agency: "0001",
      accountNumber: "12345-6",
      balance: 25000,
    },
  });

  const pixMethod = await prisma.registryEntry.findFirst({ where: { type: "PAYMENT_METHOD", code: "PIX" } });
  const boletoMethod = await prisma.registryEntry.findFirst({ where: { type: "PAYMENT_METHOD", code: "BOLETO" } });
  const cardMethod = await prisma.registryEntry.findFirst({ where: { type: "PAYMENT_METHOD", code: "CARD" } });

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const financialSeeds = [
    {
      type: "RECEIVABLE",
      status: "OVERDUE",
      amount: 1480,
      paidAmount: 300,
      description: "Venda faturada Bar do Ze (1/2)",
      documentNumber: "REC-SEED-001",
      dueDate: yesterday,
      clientId: client.id,
      categoryId: revenueAccount.id,
      costCenterId: salesCostCenter.id,
      paymentMethodId: boletoMethod?.id,
      paymentMethodName: "Boleto",
      installmentNumber: 1,
      totalInstallments: 2,
    },
    {
      type: "RECEIVABLE",
      status: "PENDING",
      amount: 1480,
      paidAmount: 0,
      description: "Venda faturada Bar do Ze (2/2)",
      documentNumber: "REC-SEED-002",
      dueDate: nextWeek,
      clientId: client.id,
      categoryId: revenueAccount.id,
      costCenterId: salesCostCenter.id,
      paymentMethodId: boletoMethod?.id,
      paymentMethodName: "Boleto",
      installmentNumber: 2,
      totalInstallments: 2,
    },
    {
      type: "PAYABLE",
      status: "PENDING",
      amount: 920,
      paidAmount: 0,
      description: "Compra de bebidas Ambev",
      documentNumber: "PAG-SEED-001",
      dueDate: tomorrow,
      supplierName: "Ambev S/A",
      categoryId: supplierAccount.id,
      costCenterId: logisticsCostCenter.id,
      paymentMethodId: pixMethod?.id,
      paymentMethodName: "PIX",
    },
    {
      type: "PAYABLE",
      status: "OVERDUE",
      amount: 430,
      paidAmount: 0,
      description: "Guia ICMS-ST bebidas",
      documentNumber: "PAG-SEED-002",
      dueDate: yesterday,
      supplierName: "Secretaria da Fazenda",
      categoryId: taxAccount.id,
      costCenterId: salesCostCenter.id,
      paymentMethodId: pixMethod?.id,
      paymentMethodName: "PIX",
    },
  ];

  for (const entry of financialSeeds) {
    const exists = await prisma.financialTransaction.count({
      where: { documentNumber: entry.documentNumber },
    });

    if (!exists) {
      await prisma.financialTransaction.create({
        data: {
          ...entry,
          originalAmount: entry.amount,
          createdById: admin.id,
        },
      });
    }
  }

  const openCash = await prisma.cashSession.findFirst({
    where: { notes: "Caixa seed operacional" },
  });

  const cashSession =
    openCash ??
    (await prisma.cashSession.create({
      data: {
        openingBalance: 350,
        notes: "Caixa seed operacional",
        openedById: admin.id,
      },
    }));

  const hasSeedCashMovement = await prisma.cashMovement.count({
    where: { reference: "CX-SEED-001" },
  });

  if (!hasSeedCashMovement) {
    await prisma.cashMovement.createMany({
      data: [
        {
          cashSessionId: cashSession.id,
          type: "SUPPLY",
          amount: 200,
          methodName: "Dinheiro",
          description: "Suprimento inicial do caixa",
          reference: "CX-SEED-001",
          createdById: admin.id,
        },
        {
          cashSessionId: cashSession.id,
          type: "RECEIPT",
          amount: 179.9,
          methodName: "Cartao",
          description: "Recebimento TEF demonstrativo",
          reference: "CX-SEED-002",
          createdById: admin.id,
        },
      ],
    });
  }

  const hasSeedBankTransaction = await prisma.bankTransaction.count({
    where: { reference: "BANCO-SEED-001" },
  });

  if (!hasSeedBankTransaction) {
    await prisma.bankTransaction.createMany({
      data: [
        {
          bankAccountId: bankAccount.id,
          type: "CREDIT",
          amount: 1280,
          description: "Repasse cartao operador TEF",
          reference: "BANCO-SEED-001",
        },
        {
          bankAccountId: bankAccount.id,
          type: "DEBIT",
          amount: 36.5,
          description: "Tarifa bancaria",
          reference: "BANCO-SEED-002",
        },
      ],
    });
  }

  const hasReservation = await prisma.inventoryReservation.count({
    where: { productId: product.id, reason: "Reserva demonstrativa para pedido" },
  });

  if (!hasReservation) {
    await prisma.inventoryReservation.create({
      data: {
        productId: product.id,
        quantity: 24,
        reason: "Reserva demonstrativa para pedido",
        expiresAt: nextWeek,
        createdById: admin.id,
      },
    });
  }

  const hasCount = await prisma.inventoryCountSession.count({
    where: { code: "INV-SEED-001" },
  });

  if (!hasCount) {
    await prisma.inventoryCountSession.create({
      data: {
        code: "INV-SEED-001",
        description: "Contagem inicial demonstrativa",
        status: "COUNTING",
        startedAt: today,
        createdById: admin.id,
        items: {
          create: {
            productId: product.id,
            barcode: product.barcode,
            expectedQty: 240,
            countedQty: 238,
            differenceQty: -2,
            unitCost: product.cost,
          },
        },
      },
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
