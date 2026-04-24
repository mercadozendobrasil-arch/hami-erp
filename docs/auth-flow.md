# Authorization Flow

This document describes the recommended Shopee shop authorization flow for this project. It is written against the current repository shape:

- the service already has config loading, Prisma, and BullMQ foundations
- the service does not yet expose auth APIs
- `ShopeeShop` and `ShopeeToken` already exist in Prisma and should be reused

## Goal

Authorize a seller shop, exchange the one-time authorization code for tokens, persist the token set, and keep tokens refreshable for later Shopee API calls.

## External Inputs

- `partner_id`
- `partner_key`
- Shopee environment host: UAT or production
- backend callback URL registered in Shopee console

## Key Shopee Rules

- Generate a fresh auth URL each time; the link is short-lived.
- The callback returns `code` and `shop_id`.
- The `code` is one-time and short-lived.
- Token exchange uses `/api/v2/auth/token/get`.
- Token refresh uses `/api/v2/auth/access_token/get`.
- `access_token` is short-lived and must be refreshed before expiry.
- `refresh_token` should be replaced atomically because it is effectively single-use in refresh flow.

## Recommended Internal Flow

1. Client requests a shop authorization URL from this service.
2. Backend generates a signed Shopee authorization URL using the exact auth path and current timestamp.
3. Seller completes Shopee login/authorization in browser.
4. Shopee redirects to the configured callback URL with `code` and `shop_id`.
5. Backend validates callback params, then exchanges the code for `access_token` and `refresh_token`.
6. Backend upserts `ShopeeShop` by `shopId`.
7. Backend creates or replaces the active `ShopeeToken` record for that shop.
8. Backend returns an internal success response and optionally schedules a refresh job.

## Suggested API Surface

These endpoints are not implemented yet, but they are the natural next step for this codebase:

- `GET /api/shopee/auth/url`
- `GET /api/shopee/auth/callback`
- `POST /api/shopee/auth/refresh`
- `POST /api/shopee/auth/disconnect`

## Persistence Mapping

### `ShopeeShop`

- `shopId`: Shopee numeric shop identifier
- `region`: marketplace/site code if later needed
- `shopName`: optional metadata if fetched after auth
- `status`: `ACTIVE`, `INACTIVE`, or `DISCONNECTED`

### `ShopeeToken`

- `shopRef`: relation back to `ShopeeShop`
- `accessToken`
- `refreshToken`
- `accessTokenExpiresAt`
- `refreshTokenExpiresAt`

## Sequence

```text
Merchant -> Service: request auth URL
Service -> Shopee: build signed auth URL
Merchant -> Shopee: authorize app
Shopee -> Service callback: code + shop_id
Service -> Shopee token API: exchange code
Shopee -> Service: access_token + refresh_token + expiry
Service -> DB: upsert ShopeeShop + ShopeeToken
Service -> Queue: schedule refresh/check job
```

## Signing Notes

Use Shopee's auth-link signing recipe, not the business API signing recipe. The signing base string is sensitive to:

- exact API path
- exact timestamp
- exact environment host

If live Shopee console guidance differs from the local archived docs, preserve the working production implementation and document the mismatch.

## Error Handling

Handle at least these cases:

- callback missing `code`
- callback missing `shop_id`
- expired or already-used authorization code
- signature mismatch
- token API request rejected
- duplicate callback retries
- token persistence partially succeeded

Store enough raw error context to support Shopee escalation:

- endpoint path
- environment
- request timestamp
- `request_id` or equivalent trace field from Shopee
- response body

## Security Requirements

- Never expose `partner_key` to browsers or mobile apps.
- Token exchange must happen server to server.
- Callback endpoint should validate expected query parameters before processing.
- Refresh token updates must be atomic to avoid losing the only valid refresh token.

## Main-Branch Integration TODO Summary

- add DTOs and controller for auth URL generation
- add auth signing service
- add Shopee token client
- add callback handler and persistence layer
- add token refresh worker
- add disconnect flow and status updates
