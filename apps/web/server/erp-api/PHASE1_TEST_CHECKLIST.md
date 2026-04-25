# Shopee ERP Phase 1 Test Checklist

This checklist is for validating whether the Shopee Brazil ERP Phase 1 minimum viable loop is ready for testing.

## Test Goals

Validate the following:

- frontend pages are reachable, can request ERP APIs, and can render data
- the frontend does not call Shopee Open API directly
- Shopee integration exists only in the backend
- backend APIs are reachable
- database tables meet the `BRL / Decimal / UTC / rawJson` requirements
- sensitive information is not exposed to the frontend
- the Phase 1 main path can start, build, and be locally integrated

## Environment Requirements

### Base Environment

- Node.js: use the version required by the project
- PostgreSQL: installed and able to start
- `npm` / `pnpm`: available

### Backend Environment Variables

Configure the following in `server/erp-api/.env`:

Required:

- `DATABASE_URL`
- `FRONTEND_URL`
- `SHOPEE_PARTNER_ID`
- `SHOPEE_PARTNER_KEY`
- `SHOPEE_REDIRECT_URL`
- `SHOPEE_REGION`
- `PORT`

Optional:

- `REDIS_URL`
- `REDIS_PREFIX`

### Database Preparation

Execute:

```sql
CREATE DATABASE shopee_erp;
```

## Deployment / Startup Steps

### 1. Initialize the Backend

```bash
cd C:\Users\hamim\.codex\worktrees\e59b\ant-design-pro\server\erp-api
copy .env.example .env
npm install
npm run prisma:generate
npx prisma migrate dev
npm run start:dev
```

### 2. Backend Health Check

Visit:

- [http://localhost:3001/api/health](http://localhost:3001/api/health)

Expected:

- returns `200`
- returns a health-check result payload

### 3. Start the Frontend

```bash
cd C:\Users\hamim\.codex\worktrees\e59b\ant-design-pro
pnpm install
npm run start:dev
```

## Test URLs

### Page URLs

- [http://localhost:8000/shop/auth](http://localhost:8000/shop/auth)
- [http://localhost:8000/shop/list](http://localhost:8000/shop/list)
- [http://localhost:8000/product/list](http://localhost:8000/product/list)
- [http://localhost:8000/order/list](http://localhost:8000/order/list)

### API URLs

- [http://localhost:8000/api/health](http://localhost:8000/api/health)
- [http://localhost:8000/api/shopee/auth/url](http://localhost:8000/api/shopee/auth/url)
- [http://localhost:8000/api/shops](http://localhost:8000/api/shops)
- [http://localhost:8000/api/products](http://localhost:8000/api/products)
- [http://localhost:8000/api/orders](http://localhost:8000/api/orders)

## Test Checklist

### 1. Page Accessibility

| Test Item | Path | Check Point | Expected Result | Result |
| --- | --- | --- | --- | --- |
| Shop authorization page | `/shop/auth` | Page opens normally | Page renders normally, no blank screen and no console error | `[ ] Pass [ ] Fail` |
| Shop list page | `/shop/list` | Page opens normally | Table renders normally | `[ ] Pass [ ] Fail` |
| Product list page | `/product/list` | Page opens normally | Table renders normally | `[ ] Pass [ ] Fail` |
| Order list page | `/order/list` | Page opens normally | Table renders normally | `[ ] Pass [ ] Fail` |

### 2. Page Data Integration

| Test Item | Page | Check Point | Expected Result | Result |
| --- | --- | --- | --- | --- |
| Authorization request | `/shop/auth` | Click the authorize button | Requests `/api/shopee/auth/url`, not Shopee directly | `[ ] Pass [ ] Fail` |
| Shop list data | `/shop/list` | Table fields | Shows `shopId / shopName / siteCode / channel / status` | `[ ] Pass [ ] Fail` |
| Product list data | `/product/list` | Table fields | Shows `platformProductId / title / status / stock / price` | `[ ] Pass [ ] Fail` |
| Order list data | `/order/list` | Table fields | Shows `orderNo / shopName / orderStatus / buyerName / currency / totalAmount / createdAt` | `[ ] Pass [ ] Fail` |
| ProTable response shape | list pages | Response structure | Contains `data / success / total` | `[ ] Pass [ ] Fail` |

### 3. API Availability

| Test Item | API | Check Point | Expected Result | Result |
| --- | --- | --- | --- | --- |
| Health check | `/api/health` | Response status | `200` and health payload | `[ ] Pass [ ] Fail` |
| Shopee authorization URL | `/api/shopee/auth/url` | Response content | Returns a usable authorization URL | `[ ] Pass [ ] Fail` |
| Shop list | `/api/shops` | Response content | Returns ERP fields, not raw Shopee response | `[ ] Pass [ ] Fail` |
| Product list | `/api/products` | Response content | Returns ERP fields and contains `data / success / total` | `[ ] Pass [ ] Fail` |
| Order list | `/api/orders` | Response content | Returns ERP fields and contains `data / success / total` | `[ ] Pass [ ] Fail` |

### 4. Database Structure

| Test Item | Check Point | Expected Result | Result |
| --- | --- | --- | --- |
| Shop table | `channel_shop` exists | Pass | `[ ] Pass [ ] Fail` |
| Token table | `channel_token` exists | Pass | `[ ] Pass [ ] Fail` |
| Product table | `erp_product` exists | Pass | `[ ] Pass [ ] Fail` |
| Order table | `erp_order` exists | Pass | `[ ] Pass [ ] Fail` |
| Monetary fields | `Decimal(18,2)` | Pass | `[ ] Pass [ ] Fail` |
| Time fields | `UTC / timestamptz` | Pass | `[ ] Pass [ ] Fail` |
| Raw response fields | `rawJson` exists | Pass | `[ ] Pass [ ] Fail` |
| Unique constraints | `shopId`, `orderNo` unique | Pass | `[ ] Pass [ ] Fail` |

### 5. Security and Boundary Checks

| Test Item | Check Point | Expected Result | Result |
| --- | --- | --- | --- |
| Frontend direct Shopee access | Network / code inspection | Frontend does not request Shopee Open API directly | `[ ] Pass [ ] Fail` |
| Sensitive data exposure | Page / Network / code inspection | `partner_key / access_token / refresh_token` are not exposed | `[ ] Pass [ ] Fail` |
| SDK boundary | Backend code inspection | Shopee SDK exists only in the backend | `[ ] Pass [ ] Fail` |
| Controller coupling | Backend code inspection | Controller does not directly initialize Shopee SDK | `[ ] Pass [ ] Fail` |
| Frontend service boundary | Frontend code inspection | ERP API logic stays in `src/services/erp/*` | `[ ] Pass [ ] Fail` |

### 6. Build Verification

Frontend build:

```bash
cd C:\Users\hamim\.codex\worktrees\e59b\ant-design-pro
npm run build
```

Backend build:

```bash
cd C:\Users\hamim\.codex\worktrees\e59b\ant-design-pro\server\erp-api
npm run build
```

| Test Item | Expected Result | Result |
| --- | --- | --- |
| Frontend build | Success | `[ ] Pass [ ] Fail` |
| Backend build | Success | `[ ] Pass [ ] Fail` |

## Out of Scope for This Test Round

The following are not blocking items for Phase 1 acceptance:

- existing TypeScript issues in the `cloudflare-worker` directory
- pending shipment features
- logistics capabilities
- webhook integration
- inventory synchronization
- task-based synchronization, retries, and stronger idempotency

## Known Risks

- if `.env` is not configured from the template, `server/erp-api` cannot start
- Shopee authorization and synchronization currently cover only the Phase 1 loop; exception handling and scheduling are still lightweight
- existing `cloudflare-worker` issues still affect the repo-wide TypeScript experience, but do not block the Shopee ERP Phase 1 main path
- Shopee SDK upgrades still need runtime regression verification
