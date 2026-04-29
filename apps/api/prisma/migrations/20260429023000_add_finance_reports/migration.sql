CREATE TABLE "ErpOrderFinanceSnapshot" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "orderSn" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "revenue" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "productCost" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "platformFee" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "logisticsFee" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "otherFee" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "grossProfit" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "grossMarginRate" DECIMAL(10, 4),
  "estimated" BOOLEAN NOT NULL DEFAULT true,
  "missingCost" BOOLEAN NOT NULL DEFAULT false,
  "source" TEXT NOT NULL DEFAULT 'ORDER_PROJECTION',
  "detail" JSONB,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ErpOrderFinanceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ErpOrderFinanceSnapshot_shopId_orderSn_key" ON "ErpOrderFinanceSnapshot"("shopId", "orderSn");
CREATE INDEX "ErpOrderFinanceSnapshot_shopId_calculatedAt_idx" ON "ErpOrderFinanceSnapshot"("shopId", "calculatedAt");
CREATE INDEX "ErpOrderFinanceSnapshot_grossProfit_idx" ON "ErpOrderFinanceSnapshot"("grossProfit");
CREATE INDEX "ErpOrderFinanceSnapshot_missingCost_idx" ON "ErpOrderFinanceSnapshot"("missingCost");
