# Distribuidora ERP Backend

Backend seguro e modular para um sistema de gestao de distribuidora de bebidas, construido com NestJS, PostgreSQL e Prisma.

## Stack

- Node.js + TypeScript
- NestJS
- PostgreSQL
- Prisma ORM
- JWT + Refresh Token
- bcrypt
- class-validator
- Helmet
- nestjs-pino

## Modulos

- `auth`
- `users`
- `clients`
- `products`
- `inventory`
- `orders`
- `deliveries`
- `financial`
- `invoices`
- `reports`
- `audit`
- `health`

## Seguranca implementada

- JWT com expiração curta e refresh token com hash
- RBAC com `admin`, `vendedor` e `entregador`
- Guards globais de autenticacao e autorizacao
- Helmet
- Rate limiting global e endpoint de login com limite agressivo
- Sanitizacao global de inputs
- Validacao global com `whitelist` e `forbidNonWhitelisted`
- Logs estruturados com redacao de campos sensiveis
- Protecao contra IDOR com verificacao de ownership em clientes, pedidos e entregas
- Hash de senha com bcrypt
- Auditoria de acoes sensiveis
- CORS restrito e API stateless sem cookie de sessao

## Banco de dados

O schema Prisma cobre:

- `users`
- `refresh_tokens`
- `clients`
- `products`
- `inventory_movements`
- `orders`
- `order_items`
- `deliveries`
- `financial_transactions`
- `invoices`
- `audit_logs`

## Execucao local

1. Instale dependencias:

```bash
npm install
```

2. Copie variaveis:

```bash
cp .env.example .env
```

3. Suba o PostgreSQL:

```bash
docker compose up -d
```

4. Gere o client Prisma:

```bash
npm run prisma:generate
```

5. Rode migrations:

```bash
npm run prisma:migrate
```

6. Inicie a API:

```bash
npm run start:dev
```

## Endpoints principais

- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/users`
- `GET /v1/clients`
- `GET /v1/products`
- `GET /v1/inventory/movements`
- `GET /v1/orders`
- `GET /v1/deliveries`
- `GET /v1/financial/summary`
- `GET /v1/invoices`
- `GET /v1/reports/sales-summary`
- `GET /v1/health`

## Observacoes de arquitetura

- Controllers lidam apenas com HTTP e validacao de entrada
- Services concentram regras de negocio
- Repositories encapsulam acesso ao Prisma
- Auditoria e logs foram preparados para integracao com SIEM/monitoramento
- O modulo de nota fiscal ja deixa pronta a estrutura para integrar uma API externa e armazenar XML/status

## Testes

```bash
npm run test
npm run test:e2e
```
