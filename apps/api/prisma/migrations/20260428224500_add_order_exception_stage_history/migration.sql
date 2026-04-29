CREATE TABLE "ErpOrderException" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "orderSn" TEXT NOT NULL,
  "exceptionType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  "message" TEXT,
  "source" TEXT NOT NULL DEFAULT 'ERP',
  "jobRecordId" TEXT,
  "metadata" JSONB,
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ErpOrderException_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpOrderStageHistory" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "orderSn" TEXT NOT NULL,
  "fromStage" TEXT,
  "toStage" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "action" TEXT,
  "jobRecordId" TEXT,
  "metadata" JSONB,
  "operatorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ErpOrderStageHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ErpOrderException_shopId_orderSn_idx" ON "ErpOrderException"("shopId", "orderSn");
CREATE INDEX "ErpOrderException_shopId_status_idx" ON "ErpOrderException"("shopId", "status");
CREATE INDEX "ErpOrderException_exceptionType_status_idx" ON "ErpOrderException"("exceptionType", "status");
CREATE INDEX "ErpOrderException_jobRecordId_idx" ON "ErpOrderException"("jobRecordId");
CREATE INDEX "ErpOrderException_createdAt_idx" ON "ErpOrderException"("createdAt");

CREATE INDEX "ErpOrderStageHistory_shopId_orderSn_idx" ON "ErpOrderStageHistory"("shopId", "orderSn");
CREATE INDEX "ErpOrderStageHistory_toStage_idx" ON "ErpOrderStageHistory"("toStage");
CREATE INDEX "ErpOrderStageHistory_jobRecordId_idx" ON "ErpOrderStageHistory"("jobRecordId");
CREATE INDEX "ErpOrderStageHistory_createdAt_idx" ON "ErpOrderStageHistory"("createdAt");
