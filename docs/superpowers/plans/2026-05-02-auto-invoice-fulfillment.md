# Auto Invoice Fulfillment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend closed loop for issuing a fiscal invoice, registering it with Shopee, requesting shipping document generation, and moving the order toward pickup.

**Architecture:** Keep business orchestration in `ErpOrdersService`, fiscal provider calls in `ErpFiscalService`, and signed Shopee calls in SDK modules. Persist every external step through fiscal events, order logs, label records, jobs, and stage history.

**Tech Stack:** NestJS, Prisma, Jest, Shopee Open Platform SDK wrapper, Nuvem Fiscal HTTP client.

---

### Task 1: Auto Invoice Fiscal Service

**Files:**
- Modify: `apps/api/src/erp/fiscal/dto/erp-fiscal.dto.ts`
- Modify: `apps/api/src/erp/fiscal/erp-fiscal.service.ts`
- Test: `apps/api/test/erp-auto-invoice.spec.ts`

- [ ] Write a failing Jest test proving `issueOrderInvoice` calls Nuvem Fiscal, creates `ErpFiscalDocument`, and records an `ISSUE` event.
- [ ] Run `npm --workspace apps/api test -- erp-auto-invoice.spec.ts` and confirm it fails because the method does not exist.
- [ ] Add `ErpFiscalIssueOrderInvoiceDto` and implement `issueOrderInvoice`.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Shopee Invoice Upload Adapter

**Files:**
- Create: `apps/api/src/shopee-sdk/modules/invoice.sdk.ts`
- Modify: `apps/api/src/shopee-sdk/shopee-sdk.module.ts`
- Test: `apps/api/test/erp-auto-invoice.spec.ts`

- [ ] Write a failing Jest test proving the Shopee upload payload uses `order_sn`, fiscal provider document id, access key, XML availability, PDF availability, and raw fiscal metadata.
- [ ] Run the focused test and confirm it fails because `InvoiceSdk` does not exist.
- [ ] Implement `InvoiceSdk.registerInvoice`.
- [ ] Re-run the focused test and confirm it passes.

### Task 3: Order Workflow Endpoint

**Files:**
- Modify: `apps/api/src/erp/orders/dto/erp-order-action.dto.ts`
- Modify: `apps/api/src/erp/orders/erp-orders.service.ts`
- Modify: `apps/api/src/erp/orders/erp-orders.controller.ts`
- Modify: `apps/api/src/erp/erp.module.ts`
- Test: `apps/api/test/erp-auto-invoice.spec.ts`

- [ ] Write a failing Jest test proving `autoInvoiceOrder` issues invoice, registers it with Shopee, creates a shipping document task, updates invoice/order status, and returns job ids.
- [ ] Run the focused test and confirm it fails because the method/route does not exist.
- [ ] Implement DTO, service orchestration, and controller route.
- [ ] Re-run the focused test and confirm it passes.

### Task 4: Verification and Publish

**Files:**
- Verify all modified files.

- [ ] Run `npm --workspace apps/api test`.
- [ ] Run `npm --workspace apps/api run build`.
- [ ] Inspect `git status --short --branch`.
- [ ] Commit and push the scoped changes.
