# Order Sync Flow

This document defines the recommended order synchronization strategy for the service. The repository currently contains no order module, webhook handlers, or scheduled jobs, so this should be treated as the target implementation model.

## Goal

Keep internal order state aligned with Shopee order state using a combination of pull-based sync and webhook-driven updates.

## Design Principles

- Shopee order status is the external source of truth.
- Webhooks are near-real-time signals, not the only source of truth.
- Raw payloads must be preserved before transformation.
- Internal business logic should consume normalized order models, not raw Shopee payloads.

## Recommended Sync Modes

### Initial Backfill

Used when onboarding a newly authorized shop or rebuilding projections.

1. Select shop and verify token validity.
2. Pull orders using Shopee order list API within a bounded time window.
3. Fetch order detail for newly discovered or recently changed orders.
4. Normalize payloads and upsert internal order projections.

### Incremental Scheduled Sync

Used as a safety net for missed webhooks or delayed updates.

1. Run per shop on a schedule.
2. Query recently updated orders only.
3. Compare remote update timestamps or statuses.
4. Fetch detail only when an order has changed.

### Webhook-Triggered Sync

Used for low-latency updates.

1. Receive webhook and persist raw event immediately.
2. Derive idempotency key from topic plus business identifier.
3. Queue a sync job instead of writing business logic inline in the webhook controller.
4. Pull latest order detail from Shopee when payload is incomplete.
5. Update internal order projection.

## Recommended Internal Boundary

- `ShopeeOrderApiService`: list and detail calls
- `ShopeeOrderMapperService`: raw payload to internal canonical order
- `ShopeeOrderSyncService`: orchestration for pull and webhook-triggered sync
- `ShopeeOrderSyncJob`: background sync execution

## State Mapping Guidance

Create a single mapping layer from Shopee statuses to internal statuses. Keep this mapping centralized so downstream systems do not need Shopee-specific rules.

Typical external states to expect include:

- unpaid or pending payment
- ready to ship
- shipped or in transit
- completed
- cancelled
- returned or refunded

The exact mapping should be finalized against the live API payloads used by the implementation.

## Operational Concerns

- page through large order ranges safely
- avoid overlapping sync windows that create duplicate processing
- store external order IDs and update timestamps
- record raw request and response payloads for audits
- add retry logic for transient Shopee failures

## Suggested API Surface

- `POST /api/shopee/orders/sync`
- `POST /api/shopee/orders/sync/backfill`
- `GET /api/shopee/orders/:orderSn`

These endpoints can trigger jobs rather than performing full sync inline.

## Suggested Persistence Additions

Likely main-branch additions:

- external order header table
- external order line table
- order status history table
- sync cursor table per shop
- deduplication/idempotency key storage

## Main-Branch Integration TODO Summary

- add order list/detail client
- add normalized order mapping layer
- add scheduled sync worker
- add webhook-triggered sync worker
- add order projection persistence
- define status mapping contract with downstream consumers
