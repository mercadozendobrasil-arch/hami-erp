# Deprecated Shopee ERP API

This legacy NestJS service is no longer the production API for HAMI ERP.

## Current API

Use the root workspace API instead:

```bash
npm --workspace apps/api run start:dev
npm --workspace apps/api run build
```

Production deployment runs:

```bash
pm2 start apps/api/dist/main.js --name hami-erp-api
```

The frontend should call relative production paths through Nginx:

```txt
/api/shopee/auth/authorize-url
/api/shopee/auth/callback
/api/shopee/shops
/api/shopee/products
/api/shopee/orders/*
/api/shopee/logistics/*
/api/shopee/webhooks/*
/api/erp/*
```

## Cleanup status

This directory is retained only as a temporary reference while any remaining useful logic is migrated to `apps/api`.

Do not add new features here.
Do not configure production credentials here.
Do not run this service in staging or production.

## Migration checklist

Before deleting this directory completely, verify the following logic already exists in `apps/api`:

- Shopee OAuth URL generation and callback handling
- Token refresh and token persistence
- Shop listing
- Product listing, publication, price, stock, and model synchronization
- Order detail and order status synchronization
- Logistics shipment, tracking, and shipping document workflows
- Webhook raw payload persistence, idempotency, and async queue handling
- Sync logs and operational audit records

The canonical deployment guide is `docs/deployment.md`.
