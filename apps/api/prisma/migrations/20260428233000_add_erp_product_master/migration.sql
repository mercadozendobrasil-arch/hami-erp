CREATE TYPE "ErpProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "ErpPlatformPublishStatus" AS ENUM ('UNBOUND', 'DRAFT', 'PUBLISHING', 'ACTIVE', 'FAILED', 'INACTIVE');

CREATE TABLE "ErpProduct" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "categoryName" TEXT,
  "brand" TEXT,
  "status" "ErpProductStatus" NOT NULL DEFAULT 'DRAFT',
  "parentSku" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "price" DECIMAL(18, 2),
  "costPrice" DECIMAL(18, 2),
  "declaredValue" DECIMAL(18, 2),
  "weightKg" DECIMAL(10, 3),
  "widthCm" DECIMAL(10, 2),
  "lengthCm" DECIMAL(10, 2),
  "heightCm" DECIMAL(10, 2),
  "defaultImageUrl" TEXT,
  "sourceUrl" TEXT,
  "attributes" JSONB,
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ErpProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpSku" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "skuCode" TEXT NOT NULL,
  "barcode" TEXT,
  "optionName" TEXT,
  "optionValue" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "price" DECIMAL(18, 2),
  "costPrice" DECIMAL(18, 2),
  "declaredValue" DECIMAL(18, 2),
  "stock" INTEGER NOT NULL DEFAULT 0,
  "attributes" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ErpSku_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpPlatformProduct" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'SHOPEE',
  "shopId" TEXT NOT NULL,
  "itemId" TEXT,
  "publishStatus" "ErpPlatformPublishStatus" NOT NULL DEFAULT 'UNBOUND',
  "title" TEXT,
  "raw" JSONB,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ErpPlatformProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpPlatformSku" (
  "id" TEXT NOT NULL,
  "platformProductId" TEXT NOT NULL,
  "skuId" TEXT,
  "platformSkuId" TEXT,
  "modelId" TEXT,
  "skuCode" TEXT,
  "price" DECIMAL(18, 2),
  "stock" INTEGER NOT NULL DEFAULT 0,
  "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ErpPlatformSku_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpSkuMappingLog" (
  "id" TEXT NOT NULL,
  "productId" TEXT,
  "skuId" TEXT,
  "platform" TEXT NOT NULL DEFAULT 'SHOPEE',
  "shopId" TEXT,
  "itemId" TEXT,
  "modelId" TEXT,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "message" TEXT,
  "request" JSONB,
  "response" JSONB,
  "operatorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ErpSkuMappingLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ErpProduct_status_idx" ON "ErpProduct"("status");
CREATE INDEX "ErpProduct_parentSku_idx" ON "ErpProduct"("parentSku");
CREATE INDEX "ErpProduct_updatedAt_idx" ON "ErpProduct"("updatedAt");

CREATE UNIQUE INDEX "ErpSku_skuCode_key" ON "ErpSku"("skuCode");
CREATE INDEX "ErpSku_productId_idx" ON "ErpSku"("productId");
CREATE INDEX "ErpSku_status_idx" ON "ErpSku"("status");

CREATE UNIQUE INDEX "ErpPlatformProduct_platform_shopId_itemId_key" ON "ErpPlatformProduct"("platform", "shopId", "itemId");
CREATE INDEX "ErpPlatformProduct_productId_idx" ON "ErpPlatformProduct"("productId");
CREATE INDEX "ErpPlatformProduct_platform_shopId_idx" ON "ErpPlatformProduct"("platform", "shopId");
CREATE INDEX "ErpPlatformProduct_publishStatus_idx" ON "ErpPlatformProduct"("publishStatus");

CREATE INDEX "ErpPlatformSku_platformProductId_idx" ON "ErpPlatformSku"("platformProductId");
CREATE INDEX "ErpPlatformSku_skuId_idx" ON "ErpPlatformSku"("skuId");
CREATE INDEX "ErpPlatformSku_platformSkuId_idx" ON "ErpPlatformSku"("platformSkuId");
CREATE INDEX "ErpPlatformSku_modelId_idx" ON "ErpPlatformSku"("modelId");

CREATE INDEX "ErpSkuMappingLog_productId_idx" ON "ErpSkuMappingLog"("productId");
CREATE INDEX "ErpSkuMappingLog_skuId_idx" ON "ErpSkuMappingLog"("skuId");
CREATE INDEX "ErpSkuMappingLog_platform_shopId_idx" ON "ErpSkuMappingLog"("platform", "shopId");
CREATE INDEX "ErpSkuMappingLog_action_status_idx" ON "ErpSkuMappingLog"("action", "status");
CREATE INDEX "ErpSkuMappingLog_createdAt_idx" ON "ErpSkuMappingLog"("createdAt");

ALTER TABLE "ErpSku" ADD CONSTRAINT "ErpSku_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ErpProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ErpPlatformProduct" ADD CONSTRAINT "ErpPlatformProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ErpProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ErpPlatformSku" ADD CONSTRAINT "ErpPlatformSku_platformProductId_fkey" FOREIGN KEY ("platformProductId") REFERENCES "ErpPlatformProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ErpPlatformSku" ADD CONSTRAINT "ErpPlatformSku_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ErpSku"("id") ON DELETE SET NULL ON UPDATE CASCADE;
