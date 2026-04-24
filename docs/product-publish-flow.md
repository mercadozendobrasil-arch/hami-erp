# Product Publish Flow

This document describes the recommended flow for publishing products to Shopee once shop authorization is available.

The current repository does not yet have product modules, media upload services, or Shopee API clients. This is a build guide for the next implementation phase.

## Goal

Transform internal product data into Shopee-compliant payloads, upload required media, create the Shopee item, then update inventory and pricing safely.

## Core Dependencies

Product publishing should start only after these pieces exist:

- valid authorized shop with usable `access_token`
- category and attribute lookup capability
- media upload capability
- retryable background jobs for long or failure-prone calls

## Recommended End-to-End Flow

1. Validate that the target shop is connected and token is not expired.
2. Fetch or confirm Shopee category for the product.
3. Fetch required attributes, brand options, and variation constraints for that category.
4. Normalize internal product data into Shopee field names.
5. Upload images or other required media first.
6. Build the create-item payload using uploaded media IDs.
7. Create the item on Shopee.
8. If the product has variations, build and submit the model or tier-variation payload.
9. Sync resulting Shopee identifiers back to internal storage.
10. Trigger stock and price sync jobs as follow-up steps instead of overloading the create-item call.

## Recommended Internal Boundaries

- `ShopeeProductMapperService`: converts internal schema to Shopee payloads
- `ShopeeMediaService`: uploads and caches media IDs
- `ShopeeProductApiService`: wraps item/category/attribute endpoints
- `ShopeeProductJobService`: background jobs for publish/retry/update

## Suggested Publish States

Use internal job or domain states so partial failures are visible:

- `PENDING_VALIDATION`
- `MEDIA_UPLOADING`
- `READY_TO_CREATE`
- `ITEM_CREATED`
- `VARIATIONS_SYNCED`
- `COMPLETED`
- `FAILED`

## Payload Design Notes

Pay special attention to:

- category-specific required attributes
- variation structure and option ordering
- package dimensions and weight
- stock location and nested seller stock fields
- pre-order vs non-pre-order fields
- brand requirements by category

Do not send `undefined`, empty arrays, or placeholder fields Shopee rejects.

## Suggested API Surface

Future endpoints can follow this shape:

- `POST /api/shopee/products/publish`
- `POST /api/shopee/products/:id/media`
- `POST /api/shopee/products/:id/price-sync`
- `POST /api/shopee/products/:id/stock-sync`
- `GET /api/shopee/categories`
- `GET /api/shopee/categories/:categoryId/attributes`

## Failure Strategy

Separate retriable failures from mapping failures:

- retry transport, timeout, and rate-limit issues
- do not blindly retry invalid category or invalid payload problems
- preserve raw request and response payloads for debugging
- persist uploaded media IDs so retries do not re-upload unchanged assets

## Recommended Persistence Additions

These are not in the current schema yet, but main branch will likely need them:

- product mapping table between internal SKU and Shopee item/model IDs
- media asset cache table
- category/attribute cache table
- publish job state or outbox table

## Main-Branch Integration TODO Summary

- add product module and DTOs
- add category/attribute lookup client
- add media upload client with multipart handling
- add product payload mapper
- add create-item and variation sync jobs
- add product identifier persistence
