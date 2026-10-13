# DistriBev ERP

ERP para operação de uma loja/distribuidora por instância, com React/TanStack, NestJS, Prisma e PostgreSQL. A identidade visual existente foi preservada.

## Executar

**Docker completo:** na raiz, execute `docker compose up -d --build --wait` e abra **http://127.0.0.1:5188**. Banco, backend e frontend iniciam juntos no grupo `distribev`. Não precisa executar npm no Windows nem configurar `VITE_API_URL` manualmente. Primeira instalação, contas, volumes e diagnóstico: [DOCKER.md](docs/DOCKER.md).

### Execução manual opcional

Requer Node.js 22.12+ e npm, além de PostgreSQL 16. Não execute servidores manuais simultaneamente com a stack Docker nas mesmas portas.

1. Em `backend`, execute `npm ci` e configure `.env` a partir de `.env.example`.
2. Configure uma senha exclusiva do PostgreSQL e uma `DATABASE_URL` correspondente ao seu banco.
3. Com seu PostgreSQL disponível, execute `npm run prisma:generate` e `npm run prisma:deploy`.
4. Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12+ caracteres) e opcionalmente `ADMIN_NAME`; execute `npm run admin:create`. Não há administrador ou senha padrão em produção.
5. Execute `npm run build` e `npm run start:prod` no backend.
6. Na raiz, execute `npm ci`, configure `VITE_API_URL` e inicie `npm run dev`. Use o mesmo hostname para frontend/API no desenvolvimento (não misture localhost e 127.0.0.1).

Para produção use HTTPS e preferencialmente um proxy de mesma origem: frontend e `/v1` no mesmo domínio. Configure `VITE_API_URL=/v1` no build e `CORS_ORIGIN=https://seu-dominio`. Cookies HttpOnly são Secure em produção e SameSite=Strict. A hospedagem SSR depende do adaptador escolhido no TanStack; build bem-sucedido não substitui validação da hospedagem.

## Operação

- Compras recebidas geram estoque e conta a pagar atomicamente.
- Empresa e Pix: cadastro administrativo de CNPJ/CNAE/regime/endereço e chave Pix. Compras aceita importação operacional de XML de NF-e 55 com revisão, conversão e confirmação posterior de recebimento; [escopo e preparação fiscal para DF](docs/EMPRESA_PIX_E_ENTRADA_FISCAL.md).
- Vendas geram saída de estoque e recebível. Dinheiro exige caixa aberto do operador e baixa automaticamente; PIX estático exige conferência. Cartão pode usar o conector Mercado Pago Point ou registro manual com comprovante.
- Recebimentos parciais mantêm saldo pendente. O conector Point exige configuração OAuth, webhook HTTPS e homologação física; outras provedoras estão disponíveis para registro manual, sem TEF universal.
- Cancelamento de pedido não pago repõe estoque e cancela títulos/comissões pendentes. Pedidos pagos ou com documento fiscal autorizado/em processamento exigem um fluxo de estorno/devolução, ainda pendente; não são cancelados silenciosamente.
- Entregas podem ser atribuídas pelo administrador e avançadas pelo entregador responsável. A abertura de endereço em mapa externo é opcional; não há otimização automática de rota.
- Fiscal: apenas pendências internas. NF-e/NFC-e, assinatura de XML, autorização, DANFE e cancelamento fiscal dependem de provedor próprio. Não confundir com NFS-e de serviços.

## PIX e Validapay

Veja [contrato e implantação](docs/OPERACAO_E_PAGAMENTOS.md). QR estático local já funciona com chave do lojista; não passa por conta do ERP ou gateway. A baixa é manual após conferir no banco.

## Maquininhas

Veja [modelos, configuração e limites](docs/MAQUININHAS.md). A tela permite vários aparelhos por loja, com catálogo de Mercado Pago, PagBank, Stone/Ton, Cielo, Rede e SumUp. Point Smart 1/2 e Pro 2/3 compartilham o conector implementado; as demais marcas usam conferência manual. A ativação real depende de credenciais e testes no terminal do lojista.

## Validação técnica

Aplicativo Android e gravação de demonstrações: [Gravação e Android](docs/GRAVACAO_E_ANDROID.md). O Compose inicia banco, backend e frontend como uma stack única.

Frontend: `npx tsc --noEmit`, `npm run build`, `npm run lint`.

Backend: `npm run build`, `npm test -- --runInBand`, `npm run test:e2e -- --runInBand`, `npm run lint` (sem alterações automáticas).

Os testes de negócio só executam quando `TEST_DATABASE_URL` aponta para um PostgreSQL **descartável e migrado**; sem essa variável a suíte é explicitamente ignorada. Não use banco de produção: a suíte cria usuários, produtos e movimentos. Configure `DATABASE_URL` para esse banco, execute `prisma:deploy`, depois informe a mesma URL em `TEST_DATABASE_URL`. Os testes incluem concorrência de vendas/recebimento, baixa parcial, cancelamento, PIX, cookies e autorização.

## Limites de implantação

**Uma empresa por banco/instância.** O cadastro Company/Branch não implementa isolamento entre clientes; não colocar CNPJs independentes na mesma base. Multiempresa, cobrança da assinatura, conciliação de extratos/liquidação bancária, devoluções/estornos, conversão geral de embalagens, FEFO/baixa por lote, captura/emissão fiscal homologadas e paginação para bases grandes seguem como trabalho de produto. A conversão explícita da importação XML não substitui um cadastro geral de embalagens.

Agenda, notas pessoais e feedback são locais, separados por usuário; não têm sincronização ou abertura de chamado remoto. Backups devem cobrir o banco; dados locais precisam ser exportados separadamente.
