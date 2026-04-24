# Environment Variables

This document explains the environment variables currently used by the repository and the Shopee-specific variables that should be added on the main branch.

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

## Recommended Shopee Variables To Add

These are not present in `.env.example` yet, but they will be required when the Shopee modules are integrated.

### Partner Credentials

- `SHOPEE_PARTNER_ID`
- `SHOPEE_PARTNER_KEY`
- `SHOPEE_BASE_URL`
- `SHOPEE_WEBHOOK_BASE_URL`

### Auth / Callback

- `SHOPEE_AUTH_CALLBACK_URL`
- `SHOPEE_USE_SANDBOX`

### Operations

- `SHOPEE_TOKEN_REFRESH_CRON`
- `SHOPEE_ORDER_SYNC_CRON`
- `SHOPEE_HTTP_TIMEOUT_MS`
- `SHOPEE_HTTP_MAX_RETRIES`

## Configuration Recommendations

- validate all required variables at startup
- keep sandbox and production configs clearly separated
- do not infer production from missing env vars
- never log secrets in plain text
- load callback and public base URLs from config, not hardcoded values

## Example Future `.env` Block

```dotenv
SHOPEE_USE_SANDBOX=true
SHOPEE_PARTNER_ID=123456
SHOPEE_PARTNER_KEY=replace-me
SHOPEE_BASE_URL=https://partner.uat.shopeemobile.com
SHOPEE_AUTH_CALLBACK_URL=https://example.com/api/shopee/auth/callback
SHOPEE_WEBHOOK_BASE_URL=https://example.com/api/shopee/webhooks
SHOPEE_TOKEN_REFRESH_CRON=*/30 * * * *
SHOPEE_ORDER_SYNC_CRON=*/10 * * * *
SHOPEE_HTTP_TIMEOUT_MS=10000
SHOPEE_HTTP_MAX_RETRIES=3
```

## Main-Branch Integration TODO Summary

- add env schema validation
- split Shopee config from generic app config
- add explicit sandbox/production config object
- redact secrets in logs and error reports
