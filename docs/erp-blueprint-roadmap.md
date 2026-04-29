# HAMI ERP Module Blueprint Roadmap

This roadmap uses `ittim-erp` as an ERP business blueprint, but keeps `hami-erp` on the current NestJS, Prisma, React, and Shopee Open Platform architecture.

## Direction

- Keep Shopee integration server-side. The frontend should call `/api/erp/*` routes, not raw Shopee platform APIs.
- Use `ittim-erp` for module vocabulary and workflow references, not as code to copy.
- Build around local ERP projections first, then attach platform-specific synchronization behind service boundaries.
- Keep platform data and local operation data separate: Shopee order/product/payment/logistics payloads are external facts; audit, warehouse, stock, labels, exceptions, and profitability are local ERP facts.
- Prefer append-only logs and stock/order movements for business-critical state changes.

## Current Baseline

- Backend has Shopee platform modules for auth, shops, products, orders, payments, logistics, media, and webhooks.
- Backend ERP layer currently focuses on order operations and job visibility under `apps/api/src/erp`.
- Prisma already has `ShopeeShop`, `ShopeeToken`, `JobRecord`, `WebhookEvent`, `ErpOrderProjection`, `ErpOrderOperationLog`, and `ErpShippingLabelRecord`.
- Frontend already has shop, product, order, reports, and ERP service folders, with the order center being the most complete workflow.

## Target Module Map

| Module | Purpose | Backend package | Frontend area | First priority |
| --- | --- | --- | --- | --- |
| Order Center | Order status, fulfillment stage, labels, exceptions, after-sale, audit, operation logs | `apps/api/src/erp/orders` | `apps/web/src/pages/order` | P0 |
| Product Center | Local products, platform products, SKU mapping, publish/sync jobs | `apps/api/src/erp/products` | `apps/web/src/pages/product` | P1 |
| Inventory Center | Warehouses, stock ledger, stock lock, available stock, stock sync | `apps/api/src/erp/inventory` | `apps/web/src/pages/inventory` | P1 |
| Purchase & Supply | Suppliers, purchase orders, inbound receipts, procurement cost | `apps/api/src/erp/purchases` | `apps/web/src/pages/purchase` | P2 |
| Finance & Reports | Order profit, platform fees, logistics cost, settlement reports | `apps/api/src/erp/finance` | `apps/web/src/pages/reports` | P2 |
| Admin System | Roles, permissions, operator records, operation logs, task logs | `apps/api/src/erp/system` plus shared guards/logging | `apps/web/src/pages/system` | P1 |

## Phase 1: Order Center Hardening

Goal: make the existing Shopee fulfillment loop production-safe before expanding the ERP surface.

Backend scope:

- Normalize a single order lifecycle contract:
  - `orderStatus`: Shopee source status.
  - `fulfillmentStage`: local ERP stage such as `pending_audit`, `pending_shipment`, `pending_print`, `pending_pickup`, `shipped`, `completed`, `cancelled`, `abnormal`.
  - `exceptionType`: local exception category such as `address_invalid`, `inventory_shortage`, `label_failed`, `logistics_blocked`, `after_sale`, `sync_failed`.
- Extend `ErpOrderProjection` only through migrations, not ad hoc schema drift.
- Add explicit exception persistence instead of encoding exceptions only in `tags` or `remark`.
- Make label generation stateful:
  - create shipping document.
  - query shipping document result.
  - persist label readiness.
  - allow download only when ready.
- Keep `ErpOrderOperationLog` as the audit trail for batch print, ship, audit, lock, unlock, split, merge, and manual sync.
- Add idempotency keys for batch order actions so repeated UI clicks do not duplicate local operations.

Frontend scope:

- Keep `shopId` in all order URLs and table requests.
- Show a stage switcher based on local `fulfillmentStage`, not only Shopee raw status.
- Add exception queue views for address, inventory, label, logistics, after-sale, and sync failures.
- Add job progress panels for batch print, sync, and mark-ready tasks.
- Keep order actions thin: the UI sends intent to `/api/erp/orders/*`, the backend decides platform calls and local state transitions.

Acceptance checks:

- `apps/api`: `corepack pnpm exec prisma generate`, `corepack pnpm exec tsc --noEmit`, `corepack pnpm run build`, `corepack pnpm run test`.
- `apps/web`: typecheck/build for changed order screens.
- Manual smoke: shop list -> order center -> stage list -> batch label -> job detail -> label download -> operation log.

## Phase 2: Product Center

Goal: create a local product master that can map to Shopee items and future platforms.

Core models:

- `ErpProduct`: local product master with name, category, brand, status, dimensions, weight, cost, and default images.
- `ErpSku`: local SKU with SKU code, barcode, option attributes, purchase cost, declared value, and status.
- `ErpPlatformProduct`: platform item binding with `platform`, `shopId`, `itemId`, publish status, raw payload, and last sync time.
- `ErpPlatformSku`: platform model/variation binding with `platformSkuId`, `itemId`, local `skuId`, price, stock, and sync status.
- `ErpSkuMappingLog`: mapping changes and publish/sync operation history.

Backend scope:

- Add `/api/erp/products` for local product CRUD, SKU CRUD, platform bindings, and sync jobs.
- Wrap existing Shopee product SDK calls behind ERP services.
- Persist category/attribute snapshots needed for publishing.
- Add publish jobs that surface `JobRecord` progress and platform error payloads.
- Add SKU mapping validation before order stock deduction.

Frontend scope:

- Product master list.
- Product editor with SKU variants.
- Platform binding tab for Shopee item/model mapping.
- Publish/sync job drawer.
- Missing mapping queue for orders whose platform SKU is not mapped.

Acceptance checks:

- A local SKU can be linked to a Shopee item/model.
- Product publish/sync jobs expose job ID, progress, success count, failed count, and raw platform error summary.
- Orders can resolve local SKU from platform item/model IDs.

## Phase 3: Inventory Center

Goal: make stock a local ERP truth with auditable movements.

Core models:

- `ErpWarehouse`: warehouse name, region, status, address, default flag.
- `ErpWarehouseLocation`: bin/location code, warehouse relation, status.
- `ErpInventoryBalance`: current quantity by warehouse, location, and SKU.
- `ErpInventoryLedger`: append-only stock movement table.
- `ErpStockReservation`: locked stock for orders, expiry, release reason.
- `ErpStockSyncTask`: platform stock sync job state.

Stock quantity contract:

- `onHandQty`: physical quantity in warehouse.
- `reservedQty`: quantity locked by unpaid/unshipped orders or manual reservations.
- `availableQty`: `onHandQty - reservedQty - safetyQty`.
- `inTransitQty`: purchase/inbound quantity not yet received.

Backend scope:

- Add `/api/erp/inventory` for warehouse CRUD, stock query, adjustments, reservations, releases, and ledger.
- Create stock reservation on order audit or shipment preparation.
- Release stock on cancellation, refund, split removal, or manual unlock.
- Deduct stock on confirmed outbound/shipment handoff.
- Add Shopee stock sync as an async job, never as a blocking UI action.

Frontend scope:

- Warehouse list and stock balance table.
- SKU stock detail with ledger timeline.
- Manual adjustment form with reason code.
- Reservation view by order.
- Stock sync job panel.

Acceptance checks:

- Every stock quantity change has a ledger row.
- Available stock never goes below zero unless an explicit admin override is logged.
- Order shipment flow can reserve, deduct, and release stock predictably.

## Phase 4: Purchase & Supply

Goal: support replenishment from suppliers into warehouse stock.

Core models:

- `ErpSupplier`: supplier profile, contact, currency, payment terms, status.
- `ErpPurchaseOrder`: PO header with supplier, warehouse, status, expected arrival, total cost.
- `ErpPurchaseOrderLine`: SKU, quantity, unit cost, tax, discount, received quantity.
- `ErpInboundReceipt`: receiving record for one or more PO lines.
- `ErpSupplierSku`: supplier SKU mapping, MOQ, lead time, supplier price.

Backend scope:

- Add `/api/erp/purchasing` for suppliers, purchase orders, approvals, receipts, and inbound stock movements.
- Receiving a PO creates inventory ledger rows.
- Purchase cost updates SKU cost history without rewriting historical order profit.
- Add reorder suggestions from available stock, sales velocity, and lead time.

Frontend scope:

- Supplier list.
- Purchase order list and detail.
- Inbound receiving screen.
- Replenishment suggestion page.

Acceptance checks:

- PO receipt increases stock through inventory ledger.
- Partial receiving is supported.
- Supplier cost history is retained for finance calculations.

## Phase 5: Finance & Reports

Goal: provide profit and cost visibility using local ERP projections plus Shopee payment/logistics data.

Core models:

- `ErpOrderFinanceSnapshot`: immutable snapshot per order for revenue, product cost, platform fee, logistics fee, tax, refund, and profit.
- `ErpPlatformSettlement`: platform settlement statement or transaction record.
- `ErpLogisticsCost`: estimated and actual logistics cost by order/package.
- `ErpFinanceAdjustment`: manual adjustment with reason and operator.

Backend scope:

- Add `/api/erp/finance` for order profit, settlement import/sync, logistics cost, and adjustments.
- Use Shopee payment APIs behind backend services.
- Compute profit from snapshots so historical orders are stable even if product cost changes later.
- Keep report queries separate from operational order APIs.

Frontend scope:

- Order profit list and detail.
- Settlement reconciliation page.
- Logistics cost comparison.
- Dashboard cards for gross sales, profit, margin, refund impact, and pending settlement.

Acceptance checks:

- Profit snapshot can be regenerated only through an audited action.
- Platform fee and logistics fee can be traced back to source payload or manual adjustment.
- Reports do not block fulfillment workflows.

## Phase 6: Admin System

Goal: make the ERP operable by multiple users with permission, traceability, and task visibility.

Core models:

- `ErpUser`: local operator identity.
- `ErpRole`: role name and status.
- `ErpPermission`: resource/action permission key.
- `ErpUserRole`: user-role relation.
- `ErpRolePermission`: role-permission relation.
- `ErpOperationAuditLog`: normalized operation log for admin actions.
- `ErpTaskLog`: job/task execution history linked to `JobRecord`.

Backend scope:

- Add authentication/authorization guards before exposing admin mutations.
- Introduce permission keys around order actions, product publish, stock adjustment, purchase approval, finance adjustment, and system settings.
- Centralize audit logging instead of each controller writing different log shapes.
- Connect `JobRecord` to task log views and failed-job replay.

Frontend scope:

- User management.
- Role management.
- Permission assignment.
- Operation audit log.
- Task log and retry console.

Acceptance checks:

- Sensitive actions require permission checks.
- Every stock adjustment, finance adjustment, order override, and platform publish has an audit log.
- Failed jobs can be inspected and replayed by authorized users only.

## Suggested Build Order

1. Finish order exception and label readiness model.
2. Add local product and SKU master.
3. Add SKU mapping from Shopee item/model to local SKU.
4. Add warehouse, stock ledger, and reservation.
5. Connect order audit/shipment flow to stock reservation and deduction.
6. Add supplier and purchase receiving.
7. Add finance snapshots and settlement reconciliation.
8. Add role/permission/audit/task admin pages.

## Implementation Rules

- Add Prisma migrations for every schema change.
- Keep frontend service calls under `apps/web/src/services/erp`.
- Keep frontend pages thin; workflow decisions live in `apps/api/src/erp`.
- Keep Shopee SDK usage inside backend platform modules or ERP services, never directly in the frontend.
- Store raw platform payloads for traceability, but expose normalized ERP DTOs to the UI.
- Use `JobRecord` for all async operations that users may need to inspect.
- Add operation/audit logs before adding more batch actions.
- Prefer narrow, verifiable slices over large rewrites.

## First Engineering Slice

The next code slice should be small and high leverage:

1. Add `ErpOrderException` and `ErpOrderStageHistory` models.
2. Add migrations and service methods to record exception/stage changes.
3. Update order list/detail DTOs to expose `exceptionType`, `exceptionMessage`, and latest stage history.
4. Add frontend abnormal-order queue backed by real ERP API data.
5. Verify with Prisma generate, TypeScript build, API tests, and one browser smoke path.

This keeps the work attached to the existing order center while laying the foundation for inventory, product mapping, and finance later.
