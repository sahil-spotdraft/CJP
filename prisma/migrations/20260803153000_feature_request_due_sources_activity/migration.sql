-- CreateEnum
CREATE TYPE "FeatureRequestSourceType" AS ENUM ('SLACK', 'JIRA');

-- CreateEnum
CREATE TYPE "FeatureRequestActivityKind" AS ENUM ('NOTE', 'SLACK', 'JIRA', 'STATUS', 'SYSTEM');

-- AlterTable
ALTER TABLE "FeatureRequest" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FeatureRequestSource" (
    "id" TEXT NOT NULL,
    "featureRequestId" TEXT NOT NULL,
    "type" "FeatureRequestSourceType" NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureRequestSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureRequestActivity" (
    "id" TEXT NOT NULL,
    "featureRequestId" TEXT NOT NULL,
    "kind" "FeatureRequestActivityKind" NOT NULL DEFAULT 'NOTE',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceId" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureRequestActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeatureRequest_dueDate_idx" ON "FeatureRequest"("dueDate");

-- CreateIndex
CREATE INDEX "FeatureRequestSource_featureRequestId_idx" ON "FeatureRequestSource"("featureRequestId");

-- CreateIndex
CREATE INDEX "FeatureRequestSource_type_idx" ON "FeatureRequestSource"("type");

-- CreateIndex
CREATE INDEX "FeatureRequestActivity_featureRequestId_occurredAt_idx" ON "FeatureRequestActivity"("featureRequestId", "occurredAt");

-- CreateIndex
CREATE INDEX "FeatureRequestActivity_sourceId_idx" ON "FeatureRequestActivity"("sourceId");

-- AddForeignKey
ALTER TABLE "FeatureRequestSource" ADD CONSTRAINT "FeatureRequestSource_featureRequestId_fkey" FOREIGN KEY ("featureRequestId") REFERENCES "FeatureRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureRequestActivity" ADD CONSTRAINT "FeatureRequestActivity_featureRequestId_fkey" FOREIGN KEY ("featureRequestId") REFERENCES "FeatureRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureRequestActivity" ADD CONSTRAINT "FeatureRequestActivity_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "FeatureRequestSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureRequestActivity" ADD CONSTRAINT "FeatureRequestActivity_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
