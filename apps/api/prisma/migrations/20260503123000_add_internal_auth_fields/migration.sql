ALTER TABLE "ErpSystemUser"
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "lastLoginAt" TIMESTAMP(3),
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
