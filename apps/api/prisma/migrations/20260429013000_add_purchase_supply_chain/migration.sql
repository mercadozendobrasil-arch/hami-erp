CREATE TYPE "ErpPurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');
CREATE TYPE "ErpPurchaseItemStatus" AS ENUM ('PENDING', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

CREATE TABLE "ErpSupplier" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contactName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "taxId" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "remark" TEXT,
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ErpSupplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpPurchaseOrder" (
  "id" TEXT NOT NULL,
  "orderNo" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "warehouseId" TEXT,
  "status" "ErpPurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "totalAmount" DECIMAL(18, 2),
  "expectedArriveAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "remark" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ErpPurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpPurchaseOrderItem" (
  "id" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "skuCodeSnapshot" TEXT NOT NULL,
  "productTitle" TEXT,
  "quantity" INTEGER NOT NULL,
  "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
  "unitCost" DECIMAL(18, 2),
  "totalCost" DECIMAL(18, 2),
  "status" "ErpPurchaseItemStatus" NOT NULL DEFAULT 'PENDING',
  "remark" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ErpPurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ErpSupplier_code_key" ON "ErpSupplier"("code");
CREATE INDEX "ErpSupplier_active_idx" ON "ErpSupplier"("active");
CREATE INDEX "ErpSupplier_name_idx" ON "ErpSupplier"("name");

CREATE UNIQUE INDEX "ErpPurchaseOrder_orderNo_key" ON "ErpPurchaseOrder"("orderNo");
CREATE INDEX "ErpPurchaseOrder_supplierId_idx" ON "ErpPurchaseOrder"("supplierId");
CREATE INDEX "ErpPurchaseOrder_warehouseId_idx" ON "ErpPurchaseOrder"("warehouseId");
CREATE INDEX "ErpPurchaseOrder_status_idx" ON "ErpPurchaseOrder"("status");
CREATE INDEX "ErpPurchaseOrder_expectedArriveAt_idx" ON "ErpPurchaseOrder"("expectedArriveAt");
CREATE INDEX "ErpPurchaseOrder_createdAt_idx" ON "ErpPurchaseOrder"("createdAt");

CREATE INDEX "ErpPurchaseOrderItem_purchaseOrderId_idx" ON "ErpPurchaseOrderItem"("purchaseOrderId");
CREATE INDEX "ErpPurchaseOrderItem_skuId_idx" ON "ErpPurchaseOrderItem"("skuId");
CREATE INDEX "ErpPurchaseOrderItem_status_idx" ON "ErpPurchaseOrderItem"("status");

ALTER TABLE "ErpPurchaseOrder" ADD CONSTRAINT "ErpPurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "ErpSupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ErpPurchaseOrder" ADD CONSTRAINT "ErpPurchaseOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "ErpWarehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ErpPurchaseOrderItem" ADD CONSTRAINT "ErpPurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "ErpPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ErpPurchaseOrderItem" ADD CONSTRAINT "ErpPurchaseOrderItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ErpSku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
