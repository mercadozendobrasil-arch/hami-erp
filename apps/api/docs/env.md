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
- `ERP_API_BEARER_TOKEN`: legacy shared bearer token for `/erp/**` endpoints
- `ERP_API_ACCESS`: JSON object defining ERP API roles, bearer tokens, and permissions

See also:

- [`erp-api-access.md`](./erp-api-access.md) for the role-to-permission and endpoint matrix

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
- prefer `ERP_API_ACCESS` over a single shared ERP token so read, write, and jobs access can be separated
- keep `viewer`, `operator`, and `admin` bearer credentials distinct instead of sharing one frontend token across all ERP surfaces
- route all SDK requests through a single environment resolver
- never log secrets in plain text
- load callback and public base URLs from config, not hardcoded values

## Example `.env` Block

```dotenv
SHOPEE_ENV=sandbox
ERP_API_BEARER_TOKEN=replace-with-a-long-random-token
ERP_API_ACCESS={"viewer":{"token":"replace-viewer-token","permissions":["erp.read"]},"operator":{"token":"replace-operator-token","permissions":["erp.read","erp.write"]},"admin":{"token":"replace-admin-token","permissions":["erp.read","erp.write","erp.jobs.read"]}}
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
- migrate ERP clients from the legacy shared token to role-scoped `ERP_API_ACCESS`
- redact secrets in logs and error reports
