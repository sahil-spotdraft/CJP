-- CreateEnum
CREATE TYPE "ClmPriority" AS ENUM ('P0', 'P1', 'P2', 'P3');

-- CreateEnum
CREATE TYPE "ClmRequestStatus" AS ENUM ('NEW', 'DISCUSSED_WITH_PRODUCT', 'PLANNED', 'IN_PROGRESS', 'SHIPPED', 'DECLINED');

-- AlterTable
ALTER TABLE "CustomerOrg" ADD COLUMN     "arr" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Consolidation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feature" TEXT,
    "featureRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consolidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ask" TEXT NOT NULL,
    "consolidationId" TEXT,
    "featureRequestId" TEXT,
    "csOwner" TEXT,
    "priority" "ClmPriority",
    "status" "ClmRequestStatus" NOT NULL DEFAULT 'NEW',
    "productNotes" TEXT,
    "timeline" TEXT,
    "csNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Consolidation_name_key" ON "Consolidation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Consolidation_featureRequestId_key" ON "Consolidation"("featureRequestId");

-- CreateIndex
CREATE INDEX "ProductRequest_orgId_idx" ON "ProductRequest"("orgId");

-- CreateIndex
CREATE INDEX "ProductRequest_consolidationId_idx" ON "ProductRequest"("consolidationId");

-- CreateIndex
CREATE INDEX "ProductRequest_featureRequestId_idx" ON "ProductRequest"("featureRequestId");

-- CreateIndex
CREATE INDEX "ProductRequest_status_idx" ON "ProductRequest"("status");

-- AddForeignKey
ALTER TABLE "Consolidation" ADD CONSTRAINT "Consolidation_featureRequestId_fkey" FOREIGN KEY ("featureRequestId") REFERENCES "FeatureRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRequest" ADD CONSTRAINT "ProductRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "CustomerOrg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRequest" ADD CONSTRAINT "ProductRequest_consolidationId_fkey" FOREIGN KEY ("consolidationId") REFERENCES "Consolidation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRequest" ADD CONSTRAINT "ProductRequest_featureRequestId_fkey" FOREIGN KEY ("featureRequestId") REFERENCES "FeatureRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
