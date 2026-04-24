# Integration TODO

This document summarizes the work that still needs to be integrated into the main branch, grouped by module.

## Cross-Cutting Foundation

- add configuration validation for all runtime and Shopee-specific env vars
- add structured logging with secret redaction
- add a reusable Shopee HTTP client with timeout, retry, and request ID logging
- add centralized signing helpers for auth flow and business APIs
- add domain-level error normalization for Shopee responses

## Authorization Module

- add auth URL generation endpoint
- add auth callback endpoint
- implement token exchange via Shopee v2 auth API
- persist `ShopeeShop` and `ShopeeToken` safely
- add token refresh worker and expiry checks
- add disconnect/cancel authorization flow

## Product Module

- add category and attribute lookup endpoints/services
- add media upload support for multipart endpoints
- add product mapper from internal model to Shopee payload
- add publish item flow and variation/model sync
- persist external item/model identifiers
- add retry and status tracking for publish jobs

## Order Module

- add order list and detail API client methods
- add manual backfill and incremental sync jobs
- add normalized order mapping boundary
- add order status mapping contract
- add persistence for external order projections and sync cursors

## Webhook Module

- add public webhook controller
- capture raw body before parsing where required
- persist `WebhookEvent` records before processing
- add idempotency and replay support
- route topics to dedicated workers
- connect webhook events to order and stock update flows

## Queue / Job Operations

- define named queues by domain: auth, products, orders, webhooks
- persist execution results into `JobRecord`
- add retry/backoff policy per job type
- add dead-letter or failed-job replay workflow

## API Documentation

- expand the OpenAPI file beyond the health endpoint
- add DTO examples for every public endpoint
- keep `README.md`, `docs/`, and Swagger descriptions aligned

## Testing

- add unit tests for signing and payload mapping
- add integration tests for token exchange, webhook ingestion, and order sync jobs
- add sandbox smoke tests for Shopee connectivity

## Release / Ops

- document sandbox vs production deployment settings
- confirm public callback URLs for auth and webhooks
- define monitoring and alerting for failed sync and webhook jobs
- document credential rotation procedure for `partner_key`
