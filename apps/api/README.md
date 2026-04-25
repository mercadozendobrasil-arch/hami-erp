# shopee-service

`shopee-service` is a NestJS-based backend skeleton for integrating with Shopee Open Platform. The current commit provides infrastructure and persistence groundwork only: configuration loading, Prisma, BullMQ, Swagger, Docker, and a basic health endpoint.

This branch focuses on developer-facing documentation so the next implementation phase can proceed with a shared understanding of flows, boundaries, and pending integration work.

## Current Scope

- NestJS application bootstrap with global validation
- Swagger UI bootstrap
- PostgreSQL integration through Prisma
- Redis/BullMQ bootstrap
- Basic health check endpoint: `GET /api/health`
- Initial Prisma models for shop auth, tokens, jobs, and webhook events

## What Is Not Implemented Yet

- Shopee shop authorization endpoints
- Token exchange and token refresh jobs
- Product publish APIs and payload mapping
- Order pull/sync workers
- Webhook ingestion and event routing
- Production-ready observability, retries, and idempotency controls

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create the local environment file:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Generate the Prisma client:

```bash
npm run prisma:generate
```

4. Start the service:

```bash
npm run start:dev
```

5. Optional Docker-based startup:

```bash
docker compose up --build
```

## Runtime Endpoints

- API base prefix: `/${API_PREFIX}` with default `api`
- Health check: `GET /api/health`
- Swagger UI: `http://localhost:3000/${SWAGGER_PATH}` with default `docs`

## Data Model Snapshot

The current Prisma schema establishes the persistence shape for later Shopee integration work:

- `ShopeeShop`: authorized shop identity and status
- `ShopeeToken`: access token and refresh token lifecycle
- `JobRecord`: background job execution audit
- `WebhookEvent`: raw webhook ingestion and processing status

## Documentation

- [Authorization Flow](./docs/auth-flow.md)
- [Product Publish Flow](./docs/product-publish-flow.md)
- [Order Sync Flow](./docs/order-sync-flow.md)
- [Webhook Configuration](./docs/webhook.md)
- [Environment Variables](./docs/env.md)
- [API Examples](./docs/api-examples.md)
- [Integration TODO](./docs/integration-todo.md)

Supporting assets:

- [OpenAPI Scaffold](./openapi/README.md)
- [Example Payloads](./examples/README.md)

## Suggested Next Build Order

1. Add a Shopee configuration module with env validation.
2. Implement auth URL generation, callback handling, and token exchange.
3. Add token refresh scheduling and token persistence rules.
4. Build product publishing services after auth is stable.
5. Add order sync jobs and webhook ingestion with idempotency.

## Notes For Contributors

- Set `SHOPEE_ENV` to either `sandbox` or `production` and keep both credential sets configured separately.
- All Shopee SDK traffic must resolve `baseUrl`, `partnerId`, `partnerKey`, and `redirectUrl` from the active environment config.
- Preserve raw Shopee request/response data around signing and webhook ingestion boundaries.
- Do not expose `partner_key` or refresh tokens to frontend clients.
- Keep documents in `docs/`, examples in `examples/`, and machine-readable specs in `openapi/`.
