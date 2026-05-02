# Nuvem Fiscal Integration Design

## Goal

Connect a Brazilian fiscal document model to `hami-erp` by using the three
public `nuvem-fiscal` SDK repositories as API shape references, while keeping
the actual integration native to the current NestJS, Prisma, and React
monorepo.

This design treats Nuvem Fiscal as an external fiscal document provider. It
does not encode tax-law decisions in the frontend. The backend owns credentials,
OAuth tokens, normalized DTOs, persistence, job tracking, and document download
proxying.

## Source References

- `nuvem-fiscal/nuvemfiscal-sdk-php`: broad generated API docs with service
  groups such as `CepApi`, `CnpjApi`, `ContaApi`, `EmpresaApi`, `NfeApi`,
  `NfseApi`, `NfceApi`, `CteApi`, and `MdfeApi`.
- `nuvem-fiscal/nuvemfiscal-sdk-net`: .NET SDK confirming the same REST API
  surface and OAuth access-token usage.
- `nuvem-fiscal/nuvemfiscal-sdk-delphi`: Delphi/Lazarus SDK confirming service
  grouping and scopes such as `empresa`, `cep`, `cnpj`, `nfe`, `nfce`, `nfse`,
  `cte`, and `mdfe`.
- Official Nuvem Fiscal docs: REST API for fiscal documents, CEP/CNPJ lookup,
  company setup, quotas, and OAuth2 `client_credentials` authentication.

## Recommended Scope

Implement Approach A in two increments.

### Increment 1: Foundation and Safe Queries

Add a backend-owned fiscal integration under `/api/erp/fiscal` with:

- Nuvem Fiscal OAuth client credentials flow.
- token caching inside the API process.
- read-only endpoints for CEP lookup, CNPJ lookup, account quotas, and company
  configuration reads.
- local fiscal document persistence linked to `shopId`, `orderSn`, and optional
  `JobRecord`.
- backend download proxy routes for XML/PDF documents by local fiscal document
  id.
- operation logs for external fiscal API calls that affect local state.

This increment does not automatically issue, cancel, or correct fiscal
documents.

### Increment 2: Issuance Jobs

After the foundation is stable, add job-backed actions for:

- issuing NF-e or NFC-e from an ERP order.
- syncing document status from Nuvem Fiscal.
- downloading and storing document metadata after authorization.
- cancellation or correction events.

Every mutation must create a `JobRecord`, update `ErpFiscalDocument`, write
order operation logs, and record an `ErpOrderException` when the fiscal state
blocks fulfillment.

## Architecture

### Backend Boundaries

Create a small provider-focused client and an ERP-facing module:

- `apps/api/src/fiscal/nuvem-fiscal/*`
  - `nuvem-fiscal.module.ts`
  - `nuvem-fiscal-auth.service.ts`
  - `nuvem-fiscal-http.service.ts`
  - `nuvem-fiscal-error.mapper.ts`
  - `nuvem-fiscal.types.ts`
- `apps/api/src/erp/fiscal/*`
  - `erp-fiscal.controller.ts`
  - `erp-fiscal.service.ts`
  - `dto/*.ts`

The provider client only knows Nuvem Fiscal authentication, base URLs, scopes,
HTTP transport, and provider errors. The ERP fiscal service owns business
mapping, Prisma persistence, `JobRecord`, order links, and UI-facing response
shapes.

### Frontend Boundaries

The frontend must call only `/api/erp/fiscal/*`. It must not know the Nuvem
Fiscal base URL, client id, client secret, OAuth token, or raw SDK language
structures.

Add frontend service functions under:

- `apps/web/src/services/erp/fiscal.ts`

The first UI entry can be added under reports or order detail after the backend
foundation exists:

- `/reports/fiscal` for document/search operations.
- order detail fiscal panel for documents attached to a specific order.

## Configuration

Add these environment variables to `apps/api/.env.example`:

- `NUVEM_FISCAL_ENV=sandbox`
- `NUVEM_FISCAL_SANDBOX_BASE_URL=https://api.sandbox.nuvemfiscal.com.br`
- `NUVEM_FISCAL_PROD_BASE_URL=https://api.nuvemfiscal.com.br`
- `NUVEM_FISCAL_AUTH_URL=https://auth.nuvemfiscal.com.br/oauth/token`
- `NUVEM_FISCAL_CLIENT_ID=replace_me`
- `NUVEM_FISCAL_CLIENT_SECRET=replace_me`
- `NUVEM_FISCAL_SCOPES=empresa cep cnpj nfe nfce nfse`
- `NUVEM_FISCAL_TIMEOUT_MS=10000`
- `NUVEM_FISCAL_RETRY_MAX_ATTEMPTS=3`

The resolver should validate required values at startup, but should not print
the client secret in logs or error messages.

## Data Model

Add Prisma enums:

- `ErpFiscalProvider`: `NUVEM_FISCAL`
- `ErpFiscalDocumentType`: `NFE`, `NFCE`, `NFSE`, `CTE`, `MDFE`, `DCE`
- `ErpFiscalDocumentStatus`: `DRAFT`, `PROCESSING`, `AUTHORIZED`, `REJECTED`,
  `CANCELLED`, `FAILED`, `UNKNOWN`
- `ErpFiscalEventType`: `ISSUE`, `SYNC`, `DOWNLOAD_XML`, `DOWNLOAD_PDF`,
  `CANCEL`, `CORRECTION`, `WEBHOOK`, `MANUAL_UPDATE`

Add Prisma models:

- `ErpFiscalCompanyConfig`
  - provider, shopId, cpfCnpj, companyName, environment, enabled services,
    provider status, raw configuration, timestamps.
- `ErpFiscalDocument`
  - provider, type, status, shopId, orderSn, provider document id, access key,
    number, series, issue date, total amount, currency, xml/pdf availability,
    last synced time, raw response, error message, jobRecordId, timestamps.
- `ErpFiscalEvent`
  - fiscalDocumentId, event type, status, request, response, error message,
    jobRecordId, timestamps.

The document model is the local source of fiscal state for ERP screens. Nuvem
Fiscal remains the external source of truth for authorization and document
payloads.

## API Design

Initial endpoints:

- `GET /api/erp/fiscal/health`
  - returns configured environment, scopes, and whether credentials are present.
- `GET /api/erp/fiscal/cep/:cep`
  - proxies CEP lookup and returns normalized address fields.
- `GET /api/erp/fiscal/cnpj/:cnpj`
  - proxies CNPJ lookup and returns normalized company fields.
- `GET /api/erp/fiscal/quotas`
  - returns account quota data.
- `GET /api/erp/fiscal/companies/:cpfCnpj`
  - reads provider company configuration.
- `GET /api/erp/fiscal/documents`
  - lists local fiscal documents filtered by shopId, orderSn, type, status,
    keyword, and date range.
- `GET /api/erp/fiscal/documents/:id`
  - returns one local fiscal document with event history.
- `GET /api/erp/fiscal/documents/:id/xml`
  - streams XML through the backend.
- `GET /api/erp/fiscal/documents/:id/pdf`
  - streams PDF through the backend.

Later issuance endpoints:

- `POST /api/erp/fiscal/orders/:orderSn/issue`
- `POST /api/erp/fiscal/documents/:id/sync`
- `POST /api/erp/fiscal/documents/:id/cancel`

Issuance endpoints should require `shopId` and should always return a `jobId`.

## Data Flow

### Safe Query Flow

1. Frontend calls `/api/erp/fiscal/cep/:cep` or `/api/erp/fiscal/cnpj/:cnpj`.
2. ERP fiscal service asks the Nuvem Fiscal HTTP client for a bearer token.
3. HTTP client calls Nuvem Fiscal with `Authorization: Bearer <token>`.
4. ERP fiscal service normalizes the response and returns a stable DTO.

### Document List Flow

1. Order or fiscal page requests documents by `shopId` and optional `orderSn`.
2. ERP fiscal service reads `ErpFiscalDocument` and related events.
3. The response includes local status, provider id, access key, file
   availability, latest error, and timestamps.

### Issuance Flow

1. User issues a document from an order.
2. Backend creates `JobRecord` and `ErpFiscalDocument` in `PROCESSING`.
3. Backend maps order, buyer, company, item, amount, and address data into the
   provider request.
4. Provider response updates document status and raw payload.
5. Backend writes `ErpFiscalEvent`, `ErpOrderOperationLog`, and updates
   `ErpOrderProjection.invoiceStatus`.
6. Failure records the provider error, leaves the document auditable, and
   creates an active order exception.

## Error Handling

- Authentication failures return a stable ERP error code without exposing
  secrets.
- Provider validation errors are persisted on `ErpFiscalDocument.errorMessage`
  and `ErpFiscalEvent.errorMessage`.
- Timeout and retryable provider failures use bounded retry settings.
- Download endpoints return 404 when no local document exists and 409 when the
  document is not ready for the requested artifact.
- Issuance failures do not delete local fiscal records; they remain visible for
  retry and audit.

## Testing

Backend tests:

- Nuvem Fiscal auth service builds correct form-encoded client credentials
  request.
- token cache reuses valid tokens and refreshes expired tokens.
- fiscal controller validates DTOs and never accepts unknown fields.
- document list filters by `shopId`, `orderSn`, type, status, and date.
- issuance job failure records `ErpFiscalEvent`, `JobRecord`, and order
  exception.

Build checks:

- `npm --workspace apps/api test`
- `npm --workspace apps/api run build`
- `npm --workspace apps/web run tsc`

Manual smoke after implementation:

1. configure sandbox credentials.
2. call fiscal health endpoint.
3. query one CEP and one CNPJ.
4. open fiscal document list.
5. attach or create a local document record for an order.
6. verify XML/PDF download route handles not-ready state cleanly.

## Out of Scope

- Legal/tax-rule recommendation in the UI.
- frontend storage of Nuvem Fiscal credentials or tokens.
- direct frontend calls to Nuvem Fiscal.
- automatic mass issuance for all Shopee orders in the first increment.
- replacing Shopee invoice fields without a local fiscal document trail.

## Approval State

The user approved Approach A on 2026-05-02. The next step after this design
document is reviewed is to create a detailed implementation plan before writing
code.
