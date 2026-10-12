export const TERMINAL_CATALOG = [
  {
    provider: 'MERCADO_PAGO',
    name: 'Mercado Pago',
    automatic: true,
    models: ['Point Smart 1', 'Point Smart 2', 'Point Pro 2', 'Point Pro 3'],
    documentation:
      'https://www.mercadopago.com.br/developers/pt/docs/mp-point/overview',
  },
  {
    provider: 'PAGBANK',
    name: 'PagBank',
    automatic: false,
    models: [
      'Moderninha Smart',
      'Moderninha Smart 2',
      'Moderninha Pro 2',
      'Moderninha Plus 2',
      'Minizinha Chip 3',
    ],
    documentation:
      'https://faq.pagbank.com.br/duvida/manual-da-maquininha-pagbank/1090',
  },
  {
    provider: 'STONE',
    name: 'Stone',
    automatic: false,
    models: ['Stone Smart'],
    documentation: 'https://www.stone.com.br/maquina-de-cartao',
  },
  {
    provider: 'TON',
    name: 'Ton',
    automatic: false,
    models: ['T2', 'T3', 'T3 Smart'],
    documentation:
      'https://blog.ton.com.br/maquininha-ton-conheca-todos-os-modelos/',
  },
  {
    provider: 'CIELO',
    name: 'Cielo',
    automatic: false,
    models: ['LIO On', 'Flash'],
    documentation:
      'https://blog.cielo.com.br/produtos-e-servicos/maquineta-de-cartao/',
  },
  {
    provider: 'REDE',
    name: 'Rede',
    automatic: false,
    models: ['Outro modelo'],
    documentation: 'https://www.userede.com.br/',
  },
  {
    provider: 'SUMUP',
    name: 'SumUp',
    automatic: false,
    models: ['Solo', 'Smart'],
    documentation: 'https://www.sumup.com/pt-br/maquininhas/',
  },
  {
    provider: 'OTHER',
    name: 'Outra provedora',
    automatic: false,
    models: ['Outro modelo'],
    documentation: null,
  },
] as const;

// Uncertain, pending and refund/review states reserve the receivable until reconciled.
export const ACTIVE_CHARGE_STATES = ['CREATING', 'PENDING', 'REVIEW'] as const;
