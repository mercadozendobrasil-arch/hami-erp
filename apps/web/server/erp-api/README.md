# Shopee ERP Phase 1 Runbook

For the detailed QA / UAT checklist, see [PHASE1_TEST_CHECKLIST.md](./PHASE1_TEST_CHECKLIST.md).

This document only covers the Phase 1 Shopee ERP minimum viable loop:

- `/shop/auth`
- `/shop/list`
- `/product/list`
- `/order/list`
- `GET /api/shopee/auth/url`
- `GET /api/shopee/auth/callback`
- `GET /api/shops`
- `GET /api/products`
- `GET /api/orders`

It does not include the legacy `cloudflare-worker` TypeScript issues in the repo. Those files are outside the Phase 1 Shopee ERP acceptance scope.

## Environment Variables

Copy `.env.example` to `.env` in `server/erp-api` and fill in the required values.

Required variables:

- `DATABASE_URL`
  PostgreSQL connection string used by Prisma and NestJS.
- `FRONTEND_URL`
  Frontend base URL used for authorization callback redirects.
  The validator also accepts `ERP_FRONTEND_URL` as a backward-compatible alias.
- `SHOPEE_PARTNER_ID`
  Shopee partner/app id.
- `SHOPEE_PARTNER_KEY`
  Shopee partner key. Must stay on the server only.
- `SHOPEE_REDIRECT_URL`
  OAuth callback URL handled by `server/erp-api`.

Recommended variables:

- `PORT`
  Defaults to `3001`.
- `SHOPEE_REGION`
  Supported values: `TEST_GLOBAL`, `TEST_CHINA`, `GLOBAL`, `BRAZIL`, `CHINA`.
  For Shopee test accounts and test keys, use `TEST_GLOBAL`.
- `REDIS_URL`
  Optional in Phase 1.
- `REDIS_PREFIX`
  Optional prefix, defaults to `shopee-erp`.

If required environment variables are missing, the service now fails fast at startup with a single clear error listing the missing keys.

## PostgreSQL Initialization

1. Start PostgreSQL locally.
2. Create the target database.

Example:

```sql
CREATE DATABASE shopee_erp;
```

3. Confirm `DATABASE_URL` in `.env` points to that database.

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shopee_erp?schema=public"
```

## Prisma Steps

Install dependencies and generate the Prisma client:

```bash
cd C:\Users\hamim\.codex\worktrees\e59b\ant-design-pro\server\erp-api
npm install
npm run prisma:generate
```

For local development, initialize or update the schema with:

```bash
npx prisma migrate dev
```

If you only need a quick local schema sync and do not want to create a migration during a temporary test, you can use:

```bash
npm run prisma:push
```

## Backend Start

```bash
cd C:\Users\hamim\.codex\worktrees\e59b\ant-design-pro\server\erp-api
npm run start:dev
```

Health check:

- [http://localhost:3001/api/health](http://localhost:3001/api/health)

If the backend cannot start:

- check `.env`
- check PostgreSQL is running
- check `DATABASE_URL`
- run `npm run prisma:generate`
- run `npx prisma migrate dev`

## Frontend Start

```bash
cd C:\Users\hamim\.codex\worktrees\e59b\ant-design-pro
pnpm install
npm run start:dev
```

The Ant Design Pro frontend proxies `/api` to `server/erp-api` during local development.

## Validation URLs

Pages:

- [http://localhost:8000/shop/auth](http://localhost:8000/shop/auth)
- [http://localhost:8000/shop/list](http://localhost:8000/shop/list)
- [http://localhost:8000/product/list](http://localhost:8000/product/list)
- [http://localhost:8000/order/list](http://localhost:8000/order/list)

Backend APIs:

- [http://localhost:3001/api/health](http://localhost:3001/api/health)
- [http://localhost:3001/api/shopee/auth/url](http://localhost:3001/api/shopee/auth/url)
- [http://localhost:3001/api/shops](http://localhost:3001/api/shops)
- [http://localhost:3001/api/products](http://localhost:3001/api/products)
- [http://localhost:3001/api/orders](http://localhost:3001/api/orders)

Frontend proxy APIs:

- [http://localhost:8000/api/health](http://localhost:8000/api/health)
- [http://localhost:8000/api/shopee/auth/url](http://localhost:8000/api/shopee/auth/url)
- [http://localhost:8000/api/shops](http://localhost:8000/api/shops)
- [http://localhost:8000/api/products](http://localhost:8000/api/products)
- [http://localhost:8000/api/orders](http://localhost:8000/api/orders)

## Acceptance Scope

Phase 1 acceptance should use these checks:

- the Ant Design Pro frontend can start
- `server/erp-api` can start
- the four ERP pages are reachable
- the ERP API endpoints are reachable

Do not use the repo-wide `npm run tsc` as the Phase 1 acceptance gate for Shopee ERP. That command is currently affected by unrelated `cloudflare-worker` TypeScript issues that are outside this phase.

Recommended validation commands for this phase:

Frontend:

```bash
cd C:\Users\hamim\.codex\worktrees\e59b\ant-design-pro
npm run build
```

Backend:

```bash
cd C:\Users\hamim\.codex\worktrees\e59b\ant-design-pro\server\erp-api
npm run build
```
