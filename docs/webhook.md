# Webhook Configuration

This document describes how webhook support should be configured for `shopee-service` and how incoming webhook events should be handled safely.

The current codebase already contains a `WebhookEvent` Prisma model but does not yet expose a webhook endpoint. That model should be the starting point for the ingestion pipeline.

## Goal

Receive Shopee push events, persist the raw event, process it asynchronously, and ensure retries or duplicate deliveries do not corrupt state.

## Current Persistence Support

`WebhookEvent` already provides:

- `topic`
- `eventId`
- `payload`
- `status`
- `processedAt`
- optional relation to `ShopeeShop`

This is enough to start with a raw-ingestion-first design.

## Recommended Configuration Steps

1. Register a public HTTPS webhook URL in Shopee console.
2. Point the callback to a dedicated route, for example `POST /api/shopee/webhooks`.
3. Ensure the route is reachable from Shopee's public network, not just local Docker.
4. Capture the raw request body before DTO transformation if signature verification or forensics are needed later.
5. Persist the raw event first, then acknowledge quickly.
6. Hand off processing to BullMQ workers.

## Recommended Processing Flow

1. Receive request.
2. Extract or derive topic and event identifier.
3. Upsert or insert a `WebhookEvent` record.
4. If the event is already known, treat it as a duplicate and short-circuit safely.
5. Enqueue a typed processing job.
6. Worker loads the event, normalizes the payload, and dispatches to domain handlers.
7. Worker updates `WebhookEvent.status` to `PROCESSED` or `FAILED`.

## Event Families To Expect

Examples commonly seen in Shopee integrations:

- `order_status_push`
- `reserved_stock_change_push`
- `item_price_update_push`
- `item_scheduled_publish_failed_push`
- `video_upload_push`
- `violation_item_push`

Do not hardcode the system around a single event family.

## Idempotency Guidance

Use a durable deduplication key. Preferred order:

1. Shopee-provided event identifier if present
2. topic plus shop ID plus business object ID plus event timestamp

Webhook handlers must be safe to replay. Never assume "delivered once".

## Response Strategy

- return success only after raw persistence succeeds
- keep the synchronous controller path small
- move heavy downstream actions to background jobs
- log malformed payloads without crashing the process

## Local Development Notes

Local Docker alone is not enough for real Shopee webhook testing because Shopee must reach a public URL. The main branch should document the tunnel strategy used by the team, for example:

- reverse proxy on a public dev host
- temporary tunnel service in non-production
- shared staging ingress

## Main-Branch Integration TODO Summary

- add webhook controller and DTO/raw-body strategy
- add webhook queue and workers
- define topic routing table
- add idempotency policy and duplicate detection
- add replay tooling for failed events
