# API Examples

This document links the example payloads and describes how they should be used in the next implementation phase.

## Purpose

The current repository has only one live endpoint, `GET /api/health`. The examples in this folder are therefore integration design examples, not evidence of already implemented business APIs.

Use them to:

- align request and response contracts before coding controllers
- validate naming decisions across auth, products, orders, and webhooks
- seed Swagger/OpenAPI work in a consistent way

## Example Index

### Auth

- [Generate Auth URL Request](../examples/auth-url.request.json)
- [Generate Auth URL Response](../examples/auth-url.response.json)
- [Token Exchange Request](../examples/token-get.request.json)
- [Token Exchange Response](../examples/token-get.response.json)

### Products

- [Product Publish Request](../examples/product-publish.request.json)
- [Product Publish Response](../examples/product-publish.response.json)

### Orders

- [Manual Order Sync Request](../examples/order-sync.request.json)
- [Manual Order Sync Response](../examples/order-sync.response.json)

### Webhooks

- [Order Status Webhook Payload](../examples/webhook-order-status.json)

## Live Endpoint Example

Current implemented endpoint:

```http
GET /api/health
```

Expected response shape:

```json
{
  "status": "ok"
}
```

## OpenAPI Relationship

The examples here should be referenced from the machine-readable artifacts in [`openapi/`](../openapi/README.md) as controllers and DTOs are introduced.

## Main-Branch Integration TODO Summary

- convert examples into Swagger DTO examples
- attach examples to OpenAPI schemas
- keep examples synchronized with implemented controllers
