-- AlterTable
ALTER TABLE "CustomerOrg" ADD COLUMN "csOwner" TEXT;
ALTER TABLE "CustomerOrg" ADD COLUMN "contractEndDate" TIMESTAMP(3);
ALTER TABLE "CustomerOrg" ADD COLUMN "lastActivityAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RetentionAlert" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "channel" TEXT,
    "message" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetentionAlert_orgId_idx" ON "RetentionAlert"("orgId");

-- CreateIndex
CREATE INDEX "RetentionAlert_kind_idx" ON "RetentionAlert"("kind");

-- CreateIndex
CREATE INDEX "RetentionAlert_createdAt_idx" ON "RetentionAlert"("createdAt");

-- AddForeignKey
ALTER TABLE "RetentionAlert" ADD CONSTRAINT "RetentionAlert_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "CustomerOrg"("id") ON DELETE CASCADE ON UPDATE CASCADE;
