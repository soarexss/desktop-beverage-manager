# Backend do ERP

API NestJS 11, Prisma 6 e PostgreSQL 16. Consulte o [README principal](../README.md) para instalação, bootstrap do administrador e comandos de validação, e [operação e pagamentos](../docs/OPERACAO_E_PAGAMENTOS.md) para os limites do produto.

A autenticação do navegador usa cookies HttpOnly, rotação de refresh token e verificação de origem em mutações. O JWT revalida usuário, papel, ativação e versão da sessão no banco. Integrações podem usar Bearer; não armazene tokens no localStorage. Em produção são exigidos HTTPS nas origens e segredos distintos e fortes.

Os módulos preservam controllers, services e repositories. Operações com estoque, caixa e pagamentos executam transações serializáveis com repetição limitada. O RBAC inclui admin, vendedor, caixa, financeiro, fiscal, compras, estoquista e entregador. PIX estático não confirma recebimento; fiscal ainda não emite documento autorizado. Cada cliente exige instância e banco separados.

Swagger está disponível em `/docs` apenas fora de produção. A API utiliza o prefixo `/v1`.
