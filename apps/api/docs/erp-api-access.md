# ERP API Access Control

This document explains how ERP API bearer access is modeled, how roles map to permissions, and which controller surfaces each permission unlocks.

## Goal

Keep ERP endpoints behind explicit, auditable bearer credentials without introducing a full user-login subsystem into the NestJS service.

The current model is intentionally lightweight:

- backend validates bearer credentials at startup
- each bearer token maps to a named role
- each role owns an explicit permission list
- controllers declare required permissions

## Runtime Variables

### Preferred

- `ERP_API_ACCESS`

This is a JSON object keyed by role name. Each role must define:

- `token`
- `permissions`

Example:

```dotenv
ERP_API_ACCESS={"viewer":{"token":"replace-viewer-token","permissions":["erp.read"]},"operator":{"token":"replace-operator-token","permissions":["erp.read","erp.write"]},"admin":{"token":"replace-admin-token","permissions":["erp.read","erp.write","erp.jobs.read"]}}
```

### Legacy Compatibility

- `ERP_API_BEARER_TOKEN`

If `ERP_API_ACCESS` is not present, the service still accepts the legacy shared token and treats it as full access:

- `erp.read`
- `erp.write`
- `erp.jobs.read`

This is useful for short-term migration, but new deployments should prefer `ERP_API_ACCESS`.

## Permission Model

### `erp.read`

Allows read-only ERP order access:

- order lists
- order detail
- status counts
- operation logs
- label download
- escrow read

### `erp.write`

Allows ERP order mutations and operational actions:

- order sync
- arrange shipment
- mark ready for pickup
- batch shipment actions
- label creation
- note / lock / audit / cancel
- split / merge / tags / logistics / warehouse actions

### `erp.jobs.read`

Allows access to ERP job and process tracking endpoints:

- job list
- job detail
- process lookup

## Role Matrix

| Role | Intended Use | Permissions |
| --- | --- | --- |
| `viewer` | dashboards, order inquiry, support read-only pages | `erp.read` |
| `operator` | fulfillment operators and daily ERP actions | `erp.read`, `erp.write` |
| `admin` | operations admins, debugging, job replay support | `erp.read`, `erp.write`, `erp.jobs.read` |

## Controller Matrix

### `ErpOrdersController`

Class default:

- requires `erp.read`

Method overrides:

- `POST /api/erp/orders/labels/print-task`: `erp.write`
- `POST /api/erp/orders/batch-arrange-shipment`: `erp.write`
- `POST /api/erp/orders/batch-mark-ready-for-pickup`: `erp.write`
- `POST /api/erp/orders/batch-mark-shipped`: `erp.write`
- `POST /api/erp/orders/:orderSn/sync`: `erp.write`
- `POST /api/erp/orders/:orderSn/arrange-shipment`: `erp.write`
- `POST /api/erp/orders/:orderSn/mark-ready-for-pickup`: `erp.write`

Read-only endpoints still inherit `erp.read`, including:

- `GET /api/erp/orders`
- `GET /api/erp/orders/status-counts`
- `GET /api/erp/orders/logs`
- `GET /api/erp/orders/:orderSn`
- `GET /api/erp/orders/:orderSn/escrow`
- `GET /api/erp/orders/labels/:labelId/download`

### `ErpOrderActionsController`

Class default:

- requires `erp.write`

Covered endpoints:

- `POST /api/erp/orders/:orderSn/note`
- `POST /api/erp/orders/:orderSn/lock`
- `POST /api/erp/orders/:orderSn/unlock`
- `POST /api/erp/orders/:orderSn/audit`
- `POST /api/erp/orders/:orderSn/reverse-audit`
- `POST /api/erp/orders/:orderSn/cancel`
- `POST /api/erp/orders/:orderSn/assign-warehouse`
- `POST /api/erp/orders/:orderSn/select-logistics`
- `POST /api/erp/orders/:orderSn/tags`
- `POST /api/erp/orders/:orderSn/after-sale`
- `POST /api/erp/orders/:orderSn/split`
- `POST /api/erp/orders/merge`

### `ErpJobsController`

Class default:

- requires `erp.jobs.read`

Covered endpoints:

- `GET /api/erp/jobs`
- `GET /api/erp/jobs/:jobId`
- `GET /api/erp/tasks/:taskId`
- `GET /api/erp/check-process`

## Frontend Mapping Guidance

Recommended frontend environment variables:

- `UMI_APP_ERP_VIEWER_TOKEN`
- `UMI_APP_ERP_OPERATOR_TOKEN`
- `UMI_APP_ERP_ADMIN_TOKEN`
- `UMI_APP_ERP_API_TOKEN`

Recommended deployment pattern:

1. Store all three role tokens in secrets management.
2. Pick one role token per frontend deployment surface.
3. Expose only that selected token as `UMI_APP_ERP_API_TOKEN` in the built frontend environment.

Example:

```dotenv
UMI_APP_ERP_VIEWER_TOKEN=replace-viewer-token
UMI_APP_ERP_OPERATOR_TOKEN=replace-operator-token
UMI_APP_ERP_ADMIN_TOKEN=replace-admin-token
UMI_APP_ERP_API_TOKEN=replace-operator-token
```

That pattern avoids forcing every frontend surface to behave like an admin console.

## Operational Notes

- bearer tokens should be long random values, not human-memorable strings
- rotate tokens by replacing one role at a time and redeploying the affected frontend surface
- prefer separate frontend deployments for read-only and operational workflows
- do not expose `admin` tokens to general user-facing dashboards

## Rollout Recommendation

1. Keep `ERP_API_BEARER_TOKEN` only during migration.
2. Move backend to `ERP_API_ACCESS`.
3. Move each frontend deployment to a role-specific token.
4. Remove the legacy shared token after all clients have switched.
