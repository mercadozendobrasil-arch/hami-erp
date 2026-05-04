CREATE TYPE "ShopStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONNECTED');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');
CREATE TYPE "ErpLabelStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED', 'DOWNLOADED');

CREATE TABLE "ShopeeShop" (
  "id" TEXT NOT NULL,
  "shopId" BIGINT NOT NULL,
  "region" TEXT,
  "shopName" TEXT,
  "status" "ShopStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ShopeeShop_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShopeeToken" (
  "id" TEXT NOT NULL,
  "shopRef" TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "refreshTokenExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ShopeeToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobRecord" (
  "id" TEXT NOT NULL,
  "queueName" TEXT NOT NULL,
  "jobName" TEXT NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "payload" JSONB,
  "result" JSONB,
  "errorMessage" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "JobRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpOrderProjection" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "orderSn" TEXT NOT NULL,
  "orderStatus" TEXT NOT NULL,
  "fulfillmentStage" TEXT NOT NULL,
  "packageNumber" TEXT,
  "packageStatus" TEXT,
  "logisticsStatus" TEXT,
  "shippingCarrier" TEXT,
  "shippingDocumentStatus" TEXT,
  "shippingDocumentType" TEXT,
  "invoiceStatus" TEXT,
  "buyerUsername" TEXT,
  "totalAmount" DECIMAL(18, 2),
  "currency" TEXT,
  "remark" TEXT,
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "auditStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "warehouseName" TEXT,
  "logisticsChannel" TEXT,
  "tags" JSONB,
  "afterSaleStatus" TEXT NOT NULL DEFAULT 'NONE',
  "parentOrderSn" TEXT,
  "mergedIntoOrderSn" TEXT,
  "splitGroupId" TEXT,
  "createTime" TIMESTAMP(3),
  "updateTime" TIMESTAMP(3),
  "raw" JSONB,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ErpOrderProjection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpOrderOperationLog" (
  "id" TEXT NOT NULL,
  "shopId" TEXT,
  "orderSn" TEXT,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "message" TEXT,
  "jobRecordId" TEXT,
  "request" JSONB,
  "response" JSONB,
  "errorMessage" TEXT,
  "operatorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ErpOrderOperationLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpShippingLabelRecord" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "orderSn" TEXT NOT NULL,
  "packageNumber" TEXT,
  "shippingDocumentType" TEXT,
  "status" "ErpLabelStatus" NOT NULL DEFAULT 'PENDING',
  "jobRecordId" TEXT,
  "result" JSONB,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "downloadedAt" TIMESTAMP(3),

  CONSTRAINT "ErpShippingLabelRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookEvent" (
  "id" TEXT NOT NULL,
  "shopRef" TEXT,
  "topic" TEXT NOT NULL,
  "eventId" TEXT,
  "payload" JSONB NOT NULL,
  "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopeeShop_shopId_key" ON "ShopeeShop"("shopId");

CREATE INDEX "ShopeeToken_shopRef_idx" ON "ShopeeToken"("shopRef");

CREATE INDEX "JobRecord_queueName_status_idx" ON "JobRecord"("queueName", "status");
CREATE INDEX "JobRecord_jobName_status_idx" ON "JobRecord"("jobName", "status");
CREATE INDEX "JobRecord_createdAt_idx" ON "JobRecord"("createdAt");

CREATE UNIQUE INDEX "ErpOrderProjection_shopId_orderSn_key" ON "ErpOrderProjection"("shopId", "orderSn");
CREATE INDEX "ErpOrderProjection_shopId_fulfillmentStage_idx" ON "ErpOrderProjection"("shopId", "fulfillmentStage");
CREATE INDEX "ErpOrderProjection_shopId_orderStatus_idx" ON "ErpOrderProjection"("shopId", "orderStatus");
CREATE INDEX "ErpOrderProjection_shopId_shippingDocumentStatus_idx" ON "ErpOrderProjection"("shopId", "shippingDocumentStatus");
CREATE INDEX "ErpOrderProjection_shopId_auditStatus_idx" ON "ErpOrderProjection"("shopId", "auditStatus");
CREATE INDEX "ErpOrderProjection_shopId_locked_idx" ON "ErpOrderProjection"("shopId", "locked");
CREATE INDEX "ErpOrderProjection_shopId_afterSaleStatus_idx" ON "ErpOrderProjection"("shopId", "afterSaleStatus");
CREATE INDEX "ErpOrderProjection_shopId_warehouseName_idx" ON "ErpOrderProjection"("shopId", "warehouseName");
CREATE INDEX "ErpOrderProjection_splitGroupId_idx" ON "ErpOrderProjection"("splitGroupId");
CREATE INDEX "ErpOrderProjection_updateTime_idx" ON "ErpOrderProjection"("updateTime");

CREATE INDEX "ErpOrderOperationLog_shopId_orderSn_idx" ON "ErpOrderOperationLog"("shopId", "orderSn");
CREATE INDEX "ErpOrderOperationLog_action_status_idx" ON "ErpOrderOperationLog"("action", "status");
CREATE INDEX "ErpOrderOperationLog_jobRecordId_idx" ON "ErpOrderOperationLog"("jobRecordId");
CREATE INDEX "ErpOrderOperationLog_createdAt_idx" ON "ErpOrderOperationLog"("createdAt");

CREATE INDEX "ErpShippingLabelRecord_shopId_orderSn_idx" ON "ErpShippingLabelRecord"("shopId", "orderSn");
CREATE INDEX "ErpShippingLabelRecord_status_idx" ON "ErpShippingLabelRecord"("status");
CREATE INDEX "ErpShippingLabelRecord_jobRecordId_idx" ON "ErpShippingLabelRecord"("jobRecordId");

CREATE UNIQUE INDEX "WebhookEvent_eventId_key" ON "WebhookEvent"("eventId");
CREATE INDEX "WebhookEvent_shopRef_status_idx" ON "WebhookEvent"("shopRef", "status");

ALTER TABLE "ShopeeToken" ADD CONSTRAINT "ShopeeToken_shopRef_fkey" FOREIGN KEY ("shopRef") REFERENCES "ShopeeShop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_shopRef_fkey" FOREIGN KEY ("shopRef") REFERENCES "ShopeeShop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
