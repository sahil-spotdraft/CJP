-- AlterEnum ClmPriority: add MEDIUM
ALTER TYPE "ClmPriority" ADD VALUE IF NOT EXISTS 'MEDIUM';

-- AlterEnum ClmRequestStatus: add SHARED_WITH_PRODUCT, CLOSED
ALTER TYPE "ClmRequestStatus" ADD VALUE IF NOT EXISTS 'SHARED_WITH_PRODUCT';
ALTER TYPE "ClmRequestStatus" ADD VALUE IF NOT EXISTS 'CLOSED';

-- AlterTable CustomerOrg
ALTER TABLE "CustomerOrg" ADD COLUMN IF NOT EXISTS "csOwner" TEXT;

-- AlterTable FeatureSignal AI triage fields
ALTER TABLE "FeatureSignal" ADD COLUMN IF NOT EXISTS "aiIsEnhancement" BOOLEAN;
ALTER TABLE "FeatureSignal" ADD COLUMN IF NOT EXISTS "aiInDomain" BOOLEAN;
ALTER TABLE "FeatureSignal" ADD COLUMN IF NOT EXISTS "aiDevelopable" BOOLEAN;
ALTER TABLE "FeatureSignal" ADD COLUMN IF NOT EXISTS "aiSimilarToTitle" TEXT;
ALTER TABLE "FeatureSignal" ADD COLUMN IF NOT EXISTS "aiTriageRationale" TEXT;

-- AlterTable ProductRequest
ALTER TABLE "ProductRequest" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ProductRequest_csOwner_idx" ON "ProductRequest"("csOwner");
CREATE INDEX IF NOT EXISTS "ProductRequest_priority_idx" ON "ProductRequest"("priority");

-- CreateTable ProductRequestActivity
CREATE TABLE IF NOT EXISTS "ProductRequestActivity" (
    "id" TEXT NOT NULL,
    "productRequestId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "fromValue" TEXT,
    "toValue" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductRequestActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductRequestActivity_productRequestId_idx" ON "ProductRequestActivity"("productRequestId");
CREATE INDEX IF NOT EXISTS "ProductRequestActivity_createdAt_idx" ON "ProductRequestActivity"("createdAt");

DO $$ BEGIN
  ALTER TABLE "ProductRequestActivity" ADD CONSTRAINT "ProductRequestActivity_productRequestId_fkey" FOREIGN KEY ("productRequestId") REFERENCES "ProductRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProductRequestActivity" ADD CONSTRAINT "ProductRequestActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
