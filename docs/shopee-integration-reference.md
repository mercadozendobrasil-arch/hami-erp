# Shopee Integration Reference

This note consolidates the useful Shopee integration guidance from the older
`shopee-service` repository into the current `hami-erp` shape.

## Current Boundaries

- Frontend lives in `apps/web` and should call ERP-facing `/api/erp/*` routes
  for business workflows.
- Backend lives in `apps/api` and owns Shopee auth, token storage, SDK calls,
  mapping, persistence, jobs, and webhook ingestion.
- Existing raw Shopee routes such as `/api/shopee/auth/*` and
  `/api/shopee/shops` remain the low-level platform surface.

## Authorization

The authorization flow is server-owned:

1. Generate a fresh Shopee auth URL on the backend.
2. Let the seller complete Shopee authorization in the browser.
3. Receive `code` and `shop_id` on the callback path.
4. Exchange the one-time code for `access_token` and `refresh_token`.
5. Store tokens through `ShopeeTokenService`.
6. Refresh access tokens before expiry.

Keep `partner_key`, access tokens, and refresh tokens out of frontend code.

## Products

Product publishing should stay split into clear backend responsibilities:

- product validation
- payload mapping
- media upload
- item/model creation
- price and stock sync
- retryable job tracking

Do not send raw frontend forms directly to Shopee. Normalize ERP product and SKU
data at the backend boundary first.

## Orders

Order workflows should use Shopee as the external source of truth while keeping
ERP projections for fast UI workflows:

- pull recent order lists and details when a shop/page needs fresh data
- upsert `ErpOrderProjection`
- record operation logs and job records
- expose batch work as jobs with progress and result URLs

UI flows should preserve `shopId` and avoid ambiguous cross-shop batch actions.

## Webhooks

Webhook handling should remain raw-persist-first:

1. Capture the incoming body before transformation.
2. Persist a `WebhookEvent`.
3. Derive or store an idempotency key.
4. Enqueue typed processing.
5. Update internal projections from the worker path.

Webhook pushes are near-real-time signals, not a replacement for pull-based
reconciliation.

## Migrated From Old Repos

The useful source material was:

- `shopee-service/docs/auth-flow.md`
- `shopee-service/docs/product-publish-flow.md`
- `shopee-service/docs/order-sync-flow.md`
- `shopee-service/docs/webhook.md`
- `shopee-service/docs/api-examples.md`

The old standalone docs were not copied wholesale because their endpoint
examples described an earlier repository phase. This file keeps only the parts
that match the current monorepo.
