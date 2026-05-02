# Shopee API Cleanup Plan

This document is the canonical cleanup plan for removing duplicate Shopee ERP backend code and keeping `apps/api` as the only production API.

## Decision

`apps/api` is the only backend that should be built, deployed, and extended.

The old nested frontend service has been removed. Do not recreate backend code
under `apps/web`.

## Keep

- `apps/api`
- `apps/api/src/modules/auth`
- `apps/api/src/modules/shops`
- `apps/api/src/modules/products`
- `apps/api/src/modules/media`
- `apps/api/src/modules/orders`
- `apps/api/src/modules/logistics`
- `apps/api/src/modules/payments`
- `apps/api/src/modules/webhooks`
- `apps/api/src/erp`
- `apps/api/src/infra`
- `apps/api/src/shopee-sdk`
- `apps/api/prisma`
- `apps/web`
- `docs/deployment.md`
- `deploy/nginx/hamimih.com.conf`

## Removed or Archived

- old nested frontend backend service
- committed runtime `.env` files
- committed local PostgreSQL data directories
- obsolete Phase 1 runbooks that reference `/api/shops`, `/api/products`, `/api/orders`, or `/api/shopee/auth/url`
- frontend calls that still depend on legacy API paths

## Canonical routes

Frontend code should call relative API paths only:

```txt
/api/shopee/auth/authorize-url
/api/shopee/auth/callback
/api/shopee/auth/refresh-token
/api/shopee/shops
/api/shopee/products
/api/shopee/media/*
/api/shopee/orders/*
/api/shopee/logistics/*
/api/shopee/payments/*
/api/shopee/webhooks/*
/api/erp/*
```

Do not use these legacy paths for new code:

```txt
/api/shopee/auth/url
/api/shops
/api/products
/api/orders
```

## Required Migration Coverage

Keep `apps/api` responsible for these flows:

- OAuth authorization URL generation
- OAuth callback token exchange
- token refresh and persistence
- shop listing
- product listing
- category and attribute discovery
- media upload
- item creation and update
- model, price, and stock synchronization
- order list and order detail synchronization
- order status mapping
- logistics shipment creation
- tracking number retrieval
- shipping document creation, sync, and download
- webhook raw payload persistence
- webhook idempotency key handling
- asynchronous queue processing for webhook/order sync jobs
- sync logs or audit records

## Production safety requirements

- Do not commit `.env` files.
- Do not commit local database files.
- Do not log `partner_key`, access tokens, refresh tokens, or generated signatures in production.
- Keep Shopee credentials server-side only.
- Protect logistics, shipment, invoice, and stock-changing endpoints with authentication/authorization before live production use.
- Keep sandbox and production credentials separated by `SHOPEE_ENV`.

## Verification commands

From the repository root:

```bash
npm install
npm run build:api
npm run build:web
npm run lint:api
npm run lint:web
```

After deployment:

```bash
curl -I https://hamimih.com
curl -I https://hamimih.com/api/shopee/shops
```

Expected behavior:

- `200` or valid API response: proxy and backend route are aligned
- `404`: route mismatch between frontend, Nginx, and `apps/api`
- `502`: API process is not running or Nginx upstream is wrong
