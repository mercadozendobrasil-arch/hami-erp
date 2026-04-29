CREATE TABLE "ErpSystemUser" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "displayName" TEXT,
  "email" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ErpSystemUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpSystemRole" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "permissions" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ErpSystemRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpSystemUserRole" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ErpSystemUserRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpSystemAuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "actorName" TEXT,
  "module" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "resourceId" TEXT,
  "message" TEXT,
  "request" JSONB,
  "response" JSONB,
  "errorMessage" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ErpSystemAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ErpSystemUser_username_key" ON "ErpSystemUser"("username");
CREATE INDEX "ErpSystemUser_active_idx" ON "ErpSystemUser"("active");
CREATE INDEX "ErpSystemUser_username_idx" ON "ErpSystemUser"("username");

CREATE UNIQUE INDEX "ErpSystemRole_code_key" ON "ErpSystemRole"("code");
CREATE INDEX "ErpSystemRole_active_idx" ON "ErpSystemRole"("active");
CREATE INDEX "ErpSystemRole_name_idx" ON "ErpSystemRole"("name");

CREATE UNIQUE INDEX "ErpSystemUserRole_userId_roleId_key" ON "ErpSystemUserRole"("userId", "roleId");
CREATE INDEX "ErpSystemUserRole_roleId_idx" ON "ErpSystemUserRole"("roleId");

CREATE INDEX "ErpSystemAuditLog_actorId_idx" ON "ErpSystemAuditLog"("actorId");
CREATE INDEX "ErpSystemAuditLog_module_action_idx" ON "ErpSystemAuditLog"("module", "action");
CREATE INDEX "ErpSystemAuditLog_status_idx" ON "ErpSystemAuditLog"("status");
CREATE INDEX "ErpSystemAuditLog_createdAt_idx" ON "ErpSystemAuditLog"("createdAt");

ALTER TABLE "ErpSystemUserRole" ADD CONSTRAINT "ErpSystemUserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ErpSystemUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ErpSystemUserRole" ADD CONSTRAINT "ErpSystemUserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ErpSystemRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
