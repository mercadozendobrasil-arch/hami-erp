# Nuvem Fiscal Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Nuvem Fiscal integration slice for `hami-erp`: backend fiscal models, Nuvem Fiscal OAuth/HTTP client, safe ERP fiscal query routes, local document listing/detail/download proxy contracts, and frontend service/types.

**Architecture:** Keep provider-specific OAuth and HTTP code in `apps/api/src/fiscal/nuvem-fiscal`, and keep ERP-facing persistence and routes in `apps/api/src/erp/fiscal`. The frontend remains thin and calls only `/api/erp/fiscal/*`.

**Tech Stack:** NestJS, Prisma, PostgreSQL schema, class-validator DTOs, Jest, Umi/Ant Design Pro frontend services.

---

## File Structure

- Create `apps/api/src/fiscal/nuvem-fiscal/nuvem-fiscal.types.ts` for provider config, token, normalized request, and response types.
- Create `apps/api/src/fiscal/nuvem-fiscal/nuvem-fiscal-auth.service.ts` for OAuth2 client credentials token fetch and in-memory token cache.
- Create `apps/api/src/fiscal/nuvem-fiscal/nuvem-fiscal-http.service.ts` for bearer-auth requests and file downloads.
- Create `apps/api/src/fiscal/nuvem-fiscal/nuvem-fiscal.module.ts` for provider exports.
- Create `apps/api/src/erp/fiscal/dto/erp-fiscal.dto.ts` for query/body DTOs.
- Create `apps/api/src/erp/fiscal/erp-fiscal.service.ts` for ERP-facing normalization and Prisma access.
- Create `apps/api/src/erp/fiscal/erp-fiscal.controller.ts` for `/api/erp/fiscal/*` routes.
- Modify `apps/api/src/erp/erp.module.ts` to register fiscal controller/service.
- Modify `apps/api/src/app.module.ts` to import `NuvemFiscalModule`.
- Modify `apps/api/prisma/schema.prisma` to add fiscal enums and models.
- Modify `apps/api/.env.example` to document Nuvem Fiscal config.
- Create/modify `apps/api/test/nuvem-fiscal-auth.service.spec.ts` and `apps/api/test/erp-fiscal.spec.ts`.
- Create `apps/web/src/services/erp/fiscal.ts` and extend `apps/web/src/services/erp/typings.d.ts`.

## Task 1: Provider Auth Service

**Files:**
- Create: `apps/api/test/nuvem-fiscal-auth.service.spec.ts`
- Create: `apps/api/src/fiscal/nuvem-fiscal/nuvem-fiscal.types.ts`
- Create: `apps/api/src/fiscal/nuvem-fiscal/nuvem-fiscal-auth.service.ts`

- [ ] **Step 1: Write the failing token-cache tests**

```typescript
import { ConfigService } from '@nestjs/config';

import { NuvemFiscalAuthService } from '../src/fiscal/nuvem-fiscal/nuvem-fiscal-auth.service';

describe('NuvemFiscalAuthService', () => {
  const config = new ConfigService({
    NUVEM_FISCAL_AUTH_URL: 'https://auth.nuvemfiscal.com.br/oauth/token',
    NUVEM_FISCAL_CLIENT_ID: 'client-id',
    NUVEM_FISCAL_CLIENT_SECRET: 'client-secret',
    NUVEM_FISCAL_SCOPES: 'empresa cep cnpj',
  });

  it('fetches an OAuth token with form encoded client credentials', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ access_token: 'token-1', expires_in: 3600 }),
    });
    const service = new NuvemFiscalAuthService(config, fetchImpl);

    await expect(service.getAccessToken()).resolves.toBe('token-1');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://auth.nuvemfiscal.com.br/oauth/token');
    expect(init.method).toBe('POST');
    expect(init.headers.get('content-type')).toBe('application/x-www-form-urlencoded');
    expect(String(init.body)).toContain('grant_type=client_credentials');
    expect(String(init.body)).toContain('client_id=client-id');
    expect(String(init.body)).toContain('client_secret=client-secret');
    expect(String(init.body)).toContain('scope=empresa+cep+cnpj');
  });

  it('reuses a cached access token before expiry', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ access_token: 'token-1', expires_in: 3600 }),
    });
    const service = new NuvemFiscalAuthService(config, fetchImpl);

    await service.getAccessToken();
    await service.getAccessToken();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the auth tests and verify RED**

Run: `npm --workspace apps/api test -- nuvem-fiscal-auth.service.spec.ts`

Expected: FAIL because `NuvemFiscalAuthService` does not exist.

- [ ] **Step 3: Implement provider auth types and service**

Create an injectable auth service that reads config, validates required values, sends an `application/x-www-form-urlencoded` POST to the auth URL, parses JSON, caches the token until one minute before expiry, and never includes the client secret in thrown messages.

- [ ] **Step 4: Run auth tests and verify GREEN**

Run: `npm --workspace apps/api test -- nuvem-fiscal-auth.service.spec.ts`

Expected: PASS.

## Task 2: Provider HTTP Module

**Files:**
- Create: `apps/api/src/fiscal/nuvem-fiscal/nuvem-fiscal-http.service.ts`
- Create: `apps/api/src/fiscal/nuvem-fiscal/nuvem-fiscal.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/.env.example`

- [ ] **Step 1: Add failing HTTP service tests**

Extend `apps/api/test/nuvem-fiscal-auth.service.spec.ts` with a test that constructs `NuvemFiscalHttpService`, calls `get('/cep/01001000')`, and asserts the outgoing request uses `Authorization: Bearer token-1` and the sandbox/production base URL selected by config.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm --workspace apps/api test -- nuvem-fiscal-auth.service.spec.ts`

Expected: FAIL because `NuvemFiscalHttpService` does not exist.

- [ ] **Step 3: Implement HTTP client and module**

Implement `get<T>()`, `post<T>()`, and `download()` methods using global `fetch`, the auth service, JSON parsing for API calls, `Buffer` conversion for downloads, timeout support through `AbortController`, and stable provider error messages.

- [ ] **Step 4: Register module and config docs**

Import `NuvemFiscalModule` in `AppModule` and append documented `NUVEM_FISCAL_*` values to `apps/api/.env.example`.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm --workspace apps/api test -- nuvem-fiscal-auth.service.spec.ts`

Expected: PASS.

## Task 3: Prisma Fiscal Models

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add schema presence test**

Create `apps/api/test/erp-fiscal.spec.ts` that reads `apps/api/prisma/schema.prisma` and asserts it contains `enum ErpFiscalProvider`, `model ErpFiscalDocument`, `model ErpFiscalEvent`, and `model ErpFiscalCompanyConfig`.

- [ ] **Step 2: Run schema test and verify RED**

Run: `npm --workspace apps/api test -- erp-fiscal.spec.ts`

Expected: FAIL because fiscal schema entries do not exist.

- [ ] **Step 3: Add fiscal enums and models**

Add the enums and models from the design, with indexes on `shopId`, `orderSn`, `providerDocumentId`, `accessKey`, `status`, `type`, `createdAt`, and `fiscalDocumentId`.

- [ ] **Step 4: Generate Prisma client and run schema test**

Run: `npm --workspace apps/api run prisma:generate`

Run: `npm --workspace apps/api test -- erp-fiscal.spec.ts`

Expected: both commands exit 0.

## Task 4: ERP Fiscal Routes

**Files:**
- Create: `apps/api/src/erp/fiscal/dto/erp-fiscal.dto.ts`
- Create: `apps/api/src/erp/fiscal/erp-fiscal.service.ts`
- Create: `apps/api/src/erp/fiscal/erp-fiscal.controller.ts`
- Modify: `apps/api/src/erp/erp.module.ts`
- Modify: `apps/api/test/erp-module.spec.ts`
- Modify: `apps/api/test/erp-fiscal.spec.ts`

- [ ] **Step 1: Add failing module and service tests**

Assert `ErpModule` registers `ErpFiscalController` and `ErpFiscalService`. Add unit tests for `ErpFiscalService.getHealth()`, `lookupCep()`, `lookupCnpj()`, and `listDocuments()` using mocked provider HTTP and mocked Prisma methods.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm --workspace apps/api test -- erp-module.spec.ts erp-fiscal.spec.ts`

Expected: FAIL because fiscal controller/service do not exist and module registration is missing.

- [ ] **Step 3: Implement DTOs, service, and controller**

Implement endpoints:

- `GET fiscal/health`
- `GET fiscal/cep/:cep`
- `GET fiscal/cnpj/:cnpj`
- `GET fiscal/quotas`
- `GET fiscal/companies/:cpfCnpj`
- `GET fiscal/documents`
- `GET fiscal/documents/:id`
- `GET fiscal/documents/:id/xml`
- `GET fiscal/documents/:id/pdf`

Use `erpData()` and list response shapes consistent with existing ERP modules.

- [ ] **Step 4: Run fiscal tests and verify GREEN**

Run: `npm --workspace apps/api test -- erp-module.spec.ts erp-fiscal.spec.ts`

Expected: PASS.

## Task 5: Frontend Services and Types

**Files:**
- Create: `apps/web/src/services/erp/fiscal.ts`
- Modify: `apps/web/src/services/erp/typings.d.ts`

- [ ] **Step 1: Add frontend service file and ERP fiscal types**

Add typed wrappers for health, CEP, CNPJ, quotas, company config, document list, document detail, XML URL, and PDF URL. Add `ERP.FiscalDocumentItem`, `ERP.FiscalDocumentDetail`, `ERP.FiscalDocumentQueryParams`, `ERP.FiscalHealth`, `ERP.FiscalAddress`, and `ERP.FiscalCompanyLookup`.

- [ ] **Step 2: Run frontend typecheck**

Run: `npm --workspace apps/web run tsc`

Expected: PASS.

## Task 6: Full Verification and Commit

**Files:**
- All changed files.

- [ ] **Step 1: Run API tests**

Run: `npm --workspace apps/api test`

Expected: PASS.

- [ ] **Step 2: Run API build**

Run: `npm --workspace apps/api run build`

Expected: PASS.

- [ ] **Step 3: Run web typecheck**

Run: `npm --workspace apps/web run tsc`

Expected: PASS.

- [ ] **Step 4: Review git diff**

Run: `git diff --stat`

Expected: only fiscal integration, plan, and environment documentation files are changed.

- [ ] **Step 5: Commit**

Run:

```powershell
git add apps/api apps/web docs/superpowers/plans/2026-05-02-nuvem-fiscal-implementation.md
git commit -m "feat: add nuvem fiscal foundation"
```

Expected: commit succeeds.

## Self-Review

- Spec coverage: provider client, env config, Prisma models, ERP routes, frontend service/types, tests, and first-phase non-issuance scope are covered.
- Scope: this plan intentionally excludes automatic fiscal document issuance, cancellation, correction, and full UI pages.
- Placeholder scan: no unfinished placeholders are present; `replace_me` appears only as intended `.env.example` documentation in the design.
- Type consistency: names use `NuvemFiscal*` for provider code and `ErpFiscal*` for ERP-facing code throughout.
