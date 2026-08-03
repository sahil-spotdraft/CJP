-- CreateEnum
CREATE TYPE "SuggestionTriageStatus" AS ENUM ('PENDING', 'MATCHED', 'CREATED', 'DISMISSED');

-- AlterTable
ALTER TABLE "Suggestion" ADD COLUMN "triageStatus" "SuggestionTriageStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Suggestion" ADD COLUMN "triageNote" TEXT;
ALTER TABLE "Suggestion" ADD COLUMN "featureRequestId" TEXT;

-- CreateTable
CREATE TABLE "SuggestionOrg" (
    "suggestionId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "SuggestionOrg_pkey" PRIMARY KEY ("suggestionId","orgId")
);

-- CreateIndex
CREATE INDEX "Suggestion_triageStatus_idx" ON "Suggestion"("triageStatus");

-- CreateIndex
CREATE INDEX "Suggestion_featureRequestId_idx" ON "Suggestion"("featureRequestId");

-- CreateIndex
CREATE INDEX "SuggestionOrg_orgId_idx" ON "SuggestionOrg"("orgId");

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_featureRequestId_fkey" FOREIGN KEY ("featureRequestId") REFERENCES "FeatureRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionOrg" ADD CONSTRAINT "SuggestionOrg_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionOrg" ADD CONSTRAINT "SuggestionOrg_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "CustomerOrg"("id") ON DELETE CASCADE ON UPDATE CASCADE;
