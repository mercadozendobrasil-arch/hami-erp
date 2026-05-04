# Internal ERP Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a simple internal employee login system for hami-erp.

**Architecture:** Reuse the existing `ErpSystemUser`, `ErpSystemRole`, and `ErpSystemAuditLog` models. Add password hash fields, a focused ERP auth service/controller, signed httpOnly cookie sessions, and web login/current-user/logout wiring.

**Tech Stack:** NestJS, Prisma, Node `crypto`, Umi/Max, Ant Design Pro.

---

### Task 1: Backend Auth Core

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/erp/auth/dto/erp-auth.dto.ts`
- Create: `apps/api/src/erp/auth/erp-auth.service.ts`
- Create: `apps/api/src/erp/auth/erp-auth.controller.ts`
- Create: `apps/api/test/erp-auth.spec.ts`

- [ ] Write failing tests for password verification, login cookie creation, inactive-user rejection, current-user lookup, logout cookie clearing, and audit log writes.
- [ ] Add password/session fields to `ErpSystemUser`.
- [ ] Implement scrypt password hashing and timing-safe verification.
- [ ] Implement HMAC signed session cookies using `ERP_AUTH_SECRET`.
- [ ] Implement `POST /api/erp/auth/login`, `GET /api/erp/auth/me`, and `POST /api/erp/auth/logout`.
- [ ] Add default admin bootstrap from `ERP_ADMIN_USERNAME` and `ERP_ADMIN_PASSWORD`.

### Task 2: Backend Route Protection

**Files:**
- Create: `apps/api/src/erp/auth/erp-auth.guard.ts`
- Modify: `apps/api/src/erp/erp.module.ts`
- Modify: `apps/api/src/main.ts`

- [ ] Write failing tests for allowing `/erp/auth/login` and blocking protected `/erp/*` paths without a valid cookie.
- [ ] Register the auth controller/service in `ErpModule`.
- [ ] Add a global guard that protects `/api/erp/*` except login/logout/me health-style auth routes.
- [ ] Keep Shopee public auth/webhook routes untouched.

### Task 3: Web Login Wiring

**Files:**
- Modify: `apps/web/src/services/ant-design-pro/api.ts`
- Modify: `apps/web/src/pages/user/login/index.tsx`
- Modify: `apps/web/src/app.tsx`
- Modify: `apps/web/src/components/RightContent/AvatarDropdown.tsx`

- [ ] Point login/current-user/logout services to `/api/erp/auth/*`.
- [ ] Simplify the login page to account/password only.
- [ ] Fetch current user in `getInitialState`.
- [ ] Redirect unauthenticated users to `/user/login` from protected pages.
- [ ] Ensure logout clears the server cookie and local initial state.

### Task 4: Verification

**Commands:**
- `npm --workspace apps/api test`
- `npm --workspace apps/api run build`
- `npm --workspace apps/web run tsc`

- [ ] Confirm all commands pass.
- [ ] Review `git diff --stat` and `git status --short --branch`.
