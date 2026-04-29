CREATE TYPE "ErpInventoryMovementType" AS ENUM ('INITIAL', 'ADJUSTMENT', 'PURCHASE_IN', 'SALE_LOCK', 'SALE_RELEASE', 'SALE_OUT', 'RETURN_IN', 'TRANSFER_IN', 'TRANSFER_OUT');
CREATE TYPE "ErpInventoryReservationStatus" AS ENUM ('LOCKED', 'RELEASED', 'FULFILLED', 'CANCELLED');

CREATE TABLE "ErpWarehouse" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "region" TEXT,
  "address" TEXT,
  "contactName" TEXT,
  "contactPhone" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ErpWarehouse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpInventoryBalance" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "onHand" INTEGER NOT NULL DEFAULT 0,
  "locked" INTEGER NOT NULL DEFAULT 0,
  "salable" INTEGER NOT NULL DEFAULT 0,
  "safetyStock" INTEGER NOT NULL DEFAULT 0,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ErpInventoryBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpInventoryLedger" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "movementType" "ErpInventoryMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "beforeOnHand" INTEGER NOT NULL,
  "afterOnHand" INTEGER NOT NULL,
  "beforeLocked" INTEGER NOT NULL DEFAULT 0,
  "afterLocked" INTEGER NOT NULL DEFAULT 0,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "orderSn" TEXT,
  "note" TEXT,
  "operatorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ErpInventoryLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErpInventoryReservation" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "orderSn" TEXT,
  "quantity" INTEGER NOT NULL,
  "status" "ErpInventoryReservationStatus" NOT NULL DEFAULT 'LOCKED',
  "note" TEXT,
  "operatorId" TEXT,
  "releasedAt" TIMESTAMP(3),
  "fulfilledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ErpInventoryReservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ErpWarehouse_code_key" ON "ErpWarehouse"("code");
CREATE INDEX "ErpWarehouse_active_idx" ON "ErpWarehouse"("active");
CREATE INDEX "ErpWarehouse_name_idx" ON "ErpWarehouse"("name");

CREATE UNIQUE INDEX "ErpInventoryBalance_warehouseId_skuId_key" ON "ErpInventoryBalance"("warehouseId", "skuId");
CREATE INDEX "ErpInventoryBalance_skuId_idx" ON "ErpInventoryBalance"("skuId");
CREATE INDEX "ErpInventoryBalance_warehouseId_idx" ON "ErpInventoryBalance"("warehouseId");
CREATE INDEX "ErpInventoryBalance_salable_idx" ON "ErpInventoryBalance"("salable");

CREATE INDEX "ErpInventoryLedger_warehouseId_skuId_idx" ON "ErpInventoryLedger"("warehouseId", "skuId");
CREATE INDEX "ErpInventoryLedger_skuId_createdAt_idx" ON "ErpInventoryLedger"("skuId", "createdAt");
CREATE INDEX "ErpInventoryLedger_movementType_createdAt_idx" ON "ErpInventoryLedger"("movementType", "createdAt");
CREATE INDEX "ErpInventoryLedger_referenceType_referenceId_idx" ON "ErpInventoryLedger"("referenceType", "referenceId");
CREATE INDEX "ErpInventoryLedger_orderSn_idx" ON "ErpInventoryLedger"("orderSn");

CREATE INDEX "ErpInventoryReservation_warehouseId_skuId_idx" ON "ErpInventoryReservation"("warehouseId", "skuId");
CREATE INDEX "ErpInventoryReservation_skuId_status_idx" ON "ErpInventoryReservation"("skuId", "status");
CREATE INDEX "ErpInventoryReservation_orderSn_status_idx" ON "ErpInventoryReservation"("orderSn", "status");
CREATE INDEX "ErpInventoryReservation_status_createdAt_idx" ON "ErpInventoryReservation"("status", "createdAt");

ALTER TABLE "ErpInventoryBalance" ADD CONSTRAINT "ErpInventoryBalance_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "ErpWarehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ErpInventoryBalance" ADD CONSTRAINT "ErpInventoryBalance_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ErpSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ErpInventoryLedger" ADD CONSTRAINT "ErpInventoryLedger_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "ErpWarehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ErpInventoryLedger" ADD CONSTRAINT "ErpInventoryLedger_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ErpSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ErpInventoryReservation" ADD CONSTRAINT "ErpInventoryReservation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "ErpWarehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ErpInventoryReservation" ADD CONSTRAINT "ErpInventoryReservation_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ErpSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;
