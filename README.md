# DistriBev ERP

ERP para operação de uma loja/distribuidora por instância, com React/TanStack, NestJS, Prisma e PostgreSQL. A identidade visual existente foi preservada.

## Executar

Requer Node.js 22.12+ e npm, além de PostgreSQL 16.

1. Em `backend`, execute `npm ci` e configure `.env` a partir de `.env.example`.
2. Configure uma senha exclusiva do PostgreSQL e uma `DATABASE_URL` correspondente. O Compose publica o banco somente em localhost.
3. Execute `docker compose up -d`, `npm run prisma:generate` e `npm run prisma:deploy`.
4. Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12+ caracteres) e opcionalmente `ADMIN_NAME`; execute `npm run admin:create`. Não há administrador ou senha padrão em produção.
5. Execute `npm run build` e `npm run start:prod` no backend.
6. Na raiz, execute `npm ci`, configure `VITE_API_URL` e inicie `npm run dev`. Use o mesmo hostname para frontend/API no desenvolvimento (não misture localhost e 127.0.0.1).

Para produção use HTTPS e preferencialmente um proxy de mesma origem: frontend e `/v1` no mesmo domínio. Configure `VITE_API_URL=/v1` no build e `CORS_ORIGIN=https://seu-dominio`. Cookies HttpOnly são Secure em produção e SameSite=Strict. A hospedagem SSR depende do adaptador escolhido no TanStack; build bem-sucedido não substitui validação da hospedagem.

## Operação

- Compras recebidas geram estoque e conta a pagar atomicamente.
- Vendas geram saída de estoque e recebível. Dinheiro exige caixa aberto do operador e baixa automaticamente; PIX/cartão exigem conferência em Financeiro.
- Recebimentos parciais mantêm saldo pendente. Não há integração TEF ou confirmação bancária automática nesta versão.
- Cancelamento de pedido não pago repõe estoque e cancela títulos/comissões pendentes. Pedidos pagos ou com documento fiscal autorizado/em processamento exigem um fluxo de estorno/devolução, ainda pendente; não são cancelados silenciosamente.
- Entregas podem ser atribuídas pelo administrador e avançadas pelo entregador responsável. A abertura de endereço em mapa externo é opcional; não há otimização automática de rota.
- Fiscal: apenas pendências internas. NF-e/NFC-e, assinatura de XML, autorização, DANFE e cancelamento fiscal dependem de provedor próprio. Não confundir com NFS-e de serviços.

## PIX e Validapay

Veja [contrato e implantação](docs/OPERACAO_E_PAGAMENTOS.md). QR estático local já funciona com chave do lojista; não passa por conta do ERP ou gateway. A baixa é manual após conferir no banco.

## Validação

Frontend: `npx tsc --noEmit`, `npm run build`, `npm run lint`.

Backend: `npm run build`, `npm test -- --runInBand`, `npm run test:e2e -- --runInBand`, `npm run lint` (sem alterações automáticas).

Os testes de negócio só executam quando `TEST_DATABASE_URL` aponta para um PostgreSQL **descartável e migrado**; sem essa variável a suíte é explicitamente ignorada. Não use banco de produção: a suíte cria usuários, produtos e movimentos. Configure `DATABASE_URL` para esse banco, execute `prisma:deploy`, depois informe a mesma URL em `TEST_DATABASE_URL`. Os testes incluem concorrência de vendas/recebimento, baixa parcial, cancelamento, PIX, cookies e autorização.

## Limites de implantação

**Uma empresa por banco/instância.** O cadastro Company/Branch não implementa isolamento entre clientes; não colocar CNPJs independentes na mesma base. Multiempresa, cobrança da assinatura, conciliação automática, devoluções/estornos, conversão caixa/unidade, FEFO/lotes, importação fiscal e paginação para bases grandes seguem como trabalho de produto.

Agenda, notas pessoais e feedback são locais, separados por usuário; não têm sincronização ou abertura de chamado remoto. Backups devem cobrir o banco; dados locais precisam ser exportados separadamente.
