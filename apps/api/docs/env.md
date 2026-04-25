# Environment Variables

This document explains the runtime variables used by the repository, with special focus on the active Shopee environment selection.

## Current Variables In `.env.example`

### App Runtime

- `NODE_ENV`: runtime mode, for example `development`
- `APP_NAME`: application name for logs or process labeling
- `PORT`: HTTP listen port, default `3000`
- `API_PREFIX`: global route prefix, default `api`
- `SWAGGER_PATH`: Swagger UI path, default `docs`
- `LOG_LEVEL`: intended log verbosity target

### Database

- `DATABASE_URL`: Prisma PostgreSQL connection string
- `POSTGRES_DB`: Docker Compose database name
- `POSTGRES_USER`: Docker Compose database user
- `POSTGRES_PASSWORD`: Docker Compose database password

### Redis / Queue

- `REDIS_HOST`: Redis host
- `REDIS_PORT`: Redis port
- `REDIS_PASSWORD`: optional Redis password
- `REDIS_DB`: Redis database index
- `QUEUE_PREFIX`: BullMQ key prefix

## Shopee Variables

### Active Environment

- `SHOPEE_ENV`: must be `sandbox` or `production`

### Sandbox Configuration

- `SHOPEE_SANDBOX_BASE_URL`
- `SHOPEE_SANDBOX_PARTNER_ID`
- `SHOPEE_SANDBOX_PARTNER_KEY`
- `SHOPEE_SANDBOX_REDIRECT_URL`

### Production Configuration

- `SHOPEE_PROD_BASE_URL`
- `SHOPEE_PROD_PARTNER_ID`
- `SHOPEE_PROD_PARTNER_KEY`
- `SHOPEE_PROD_REDIRECT_URL`

### Shared Shopee Runtime

- `SHOPEE_WEBHOOK_SECRET`

### Operations

- `SHOPEE_TOKEN_REFRESH_CRON`
- `SHOPEE_ORDER_SYNC_CRON`
- `SHOPEE_HTTP_TIMEOUT_MS`
- `SHOPEE_HTTP_MAX_RETRIES`

## Configuration Recommendations

- validate all required variables at startup
- keep sandbox and production configs clearly separated
- do not infer production from missing env vars
- route all SDK requests through a single environment resolver
- never log secrets in plain text
- load callback and public base URLs from config, not hardcoded values

## Example `.env` Block

```dotenv
SHOPEE_ENV=sandbox
SHOPEE_SANDBOX_BASE_URL=https://partner.test-stable.shopeemobile.com
SHOPEE_SANDBOX_PARTNER_ID=123456
SHOPEE_SANDBOX_PARTNER_KEY=replace-me
SHOPEE_SANDBOX_REDIRECT_URL=https://sandbox.example.com/api/auth/callback
SHOPEE_PROD_BASE_URL=https://partner.shopeemobile.com
SHOPEE_PROD_PARTNER_ID=654321
SHOPEE_PROD_PARTNER_KEY=replace-me-too
SHOPEE_PROD_REDIRECT_URL=https://example.com/api/auth/callback
SHOPEE_WEBHOOK_SECRET=optional-webhook-secret
SHOPEE_TOKEN_REFRESH_CRON=*/30 * * * *
SHOPEE_ORDER_SYNC_CRON=*/10 * * * *
SHOPEE_HTTP_TIMEOUT_MS=10000
SHOPEE_HTTP_MAX_RETRIES=3
```

## Main-Branch Integration TODO Summary

- add env schema validation
- keep Shopee config separate from generic app config
- keep the explicit sandbox/production config object
- redact secrets in logs and error reports
