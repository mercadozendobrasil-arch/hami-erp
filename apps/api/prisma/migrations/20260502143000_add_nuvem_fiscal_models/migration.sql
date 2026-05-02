DO $$
BEGIN
  CREATE TYPE "ErpFiscalProvider" AS ENUM ('NUVEM_FISCAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ErpFiscalDocumentType" AS ENUM ('NFE', 'NFCE', 'NFSE', 'CTE', 'MDFE', 'DCE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ErpFiscalDocumentStatus" AS ENUM ('DRAFT', 'PROCESSING', 'AUTHORIZED', 'REJECTED', 'CANCELLED', 'FAILED', 'UNKNOWN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ErpFiscalEventType" AS ENUM ('ISSUE', 'SYNC', 'DOWNLOAD_XML', 'DOWNLOAD_PDF', 'CANCEL', 'CORRECTION', 'WEBHOOK', 'MANUAL_UPDATE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ErpFiscalCompanyConfig" (
  "id" TEXT NOT NULL,
  "provider" "ErpFiscalProvider" NOT NULL DEFAULT 'NUVEM_FISCAL',
  "shopId" TEXT NOT NULL,
  "cpfCnpj" TEXT NOT NULL,
  "companyName" TEXT,
  "environment" TEXT NOT NULL DEFAULT 'sandbox',
  "enabledServices" JSONB,
  "providerStatus" TEXT,
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ErpFiscalCompanyConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ErpFiscalDocument" (
  "id" TEXT NOT NULL,
  "provider" "ErpFiscalProvider" NOT NULL DEFAULT 'NUVEM_FISCAL',
  "type" "ErpFiscalDocumentType" NOT NULL,
  "status" "ErpFiscalDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "shopId" TEXT NOT NULL,
  "orderSn" TEXT,
  "providerDocumentId" TEXT,
  "accessKey" TEXT,
  "number" TEXT,
  "series" TEXT,
  "issueDate" TIMESTAMP(3),
  "totalAmount" DECIMAL(18, 2),
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "xmlAvailable" BOOLEAN NOT NULL DEFAULT false,
  "pdfAvailable" BOOLEAN NOT NULL DEFAULT false,
  "lastSyncedAt" TIMESTAMP(3),
  "raw" JSONB,
  "errorMessage" TEXT,
  "jobRecordId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ErpFiscalDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ErpFiscalEvent" (
  "id" TEXT NOT NULL,
  "fiscalDocumentId" TEXT,
  "eventType" "ErpFiscalEventType" NOT NULL,
  "status" TEXT NOT NULL,
  "request" JSONB,
  "response" JSONB,
  "errorMessage" TEXT,
  "jobRecordId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErpFiscalEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ErpFiscalCompanyConfig_provider_shopId_cpfCnpj_environment_key" ON "ErpFiscalCompanyConfig"("provider", "shopId", "cpfCnpj", "environment");
CREATE INDEX IF NOT EXISTS "ErpFiscalCompanyConfig_shopId_idx" ON "ErpFiscalCompanyConfig"("shopId");
CREATE INDEX IF NOT EXISTS "ErpFiscalCompanyConfig_cpfCnpj_idx" ON "ErpFiscalCompanyConfig"("cpfCnpj");
CREATE INDEX IF NOT EXISTS "ErpFiscalCompanyConfig_providerStatus_idx" ON "ErpFiscalCompanyConfig"("providerStatus");
CREATE INDEX IF NOT EXISTS "ErpFiscalCompanyConfig_createdAt_idx" ON "ErpFiscalCompanyConfig"("createdAt");

CREATE INDEX IF NOT EXISTS "ErpFiscalDocument_shopId_idx" ON "ErpFiscalDocument"("shopId");
CREATE INDEX IF NOT EXISTS "ErpFiscalDocument_shopId_orderSn_idx" ON "ErpFiscalDocument"("shopId", "orderSn");
CREATE INDEX IF NOT EXISTS "ErpFiscalDocument_provider_providerDocumentId_idx" ON "ErpFiscalDocument"("provider", "providerDocumentId");
CREATE INDEX IF NOT EXISTS "ErpFiscalDocument_accessKey_idx" ON "ErpFiscalDocument"("accessKey");
CREATE INDEX IF NOT EXISTS "ErpFiscalDocument_status_idx" ON "ErpFiscalDocument"("status");
CREATE INDEX IF NOT EXISTS "ErpFiscalDocument_type_idx" ON "ErpFiscalDocument"("type");
CREATE INDEX IF NOT EXISTS "ErpFiscalDocument_createdAt_idx" ON "ErpFiscalDocument"("createdAt");
CREATE INDEX IF NOT EXISTS "ErpFiscalDocument_jobRecordId_idx" ON "ErpFiscalDocument"("jobRecordId");

CREATE INDEX IF NOT EXISTS "ErpFiscalEvent_fiscalDocumentId_idx" ON "ErpFiscalEvent"("fiscalDocumentId");
CREATE INDEX IF NOT EXISTS "ErpFiscalEvent_eventType_idx" ON "ErpFiscalEvent"("eventType");
CREATE INDEX IF NOT EXISTS "ErpFiscalEvent_status_idx" ON "ErpFiscalEvent"("status");
CREATE INDEX IF NOT EXISTS "ErpFiscalEvent_jobRecordId_idx" ON "ErpFiscalEvent"("jobRecordId");
CREATE INDEX IF NOT EXISTS "ErpFiscalEvent_createdAt_idx" ON "ErpFiscalEvent"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ErpFiscalEvent_fiscalDocumentId_fkey'
  ) THEN
    ALTER TABLE "ErpFiscalEvent"
      ADD CONSTRAINT "ErpFiscalEvent_fiscalDocumentId_fkey"
      FOREIGN KEY ("fiscalDocumentId") REFERENCES "ErpFiscalDocument"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
