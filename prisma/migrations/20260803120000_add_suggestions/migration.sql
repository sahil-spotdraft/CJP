-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "FeatureRequestStatus" NOT NULL DEFAULT 'NEW',
    "embedding" JSONB,
    "rawText" TEXT,
    "sourceLabel" TEXT NOT NULL DEFAULT 'slack',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuggestionMatch" (
    "id" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "featureRequestId" TEXT NOT NULL,
    "matchPercent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuggestionMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Suggestion_createdAt_idx" ON "Suggestion"("createdAt");

-- CreateIndex
CREATE INDEX "Suggestion_readAt_idx" ON "Suggestion"("readAt");

-- CreateIndex
CREATE INDEX "SuggestionMatch_suggestionId_idx" ON "SuggestionMatch"("suggestionId");

-- CreateIndex
CREATE INDEX "SuggestionMatch_featureRequestId_idx" ON "SuggestionMatch"("featureRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "SuggestionMatch_suggestionId_featureRequestId_key" ON "SuggestionMatch"("suggestionId", "featureRequestId");

-- AddForeignKey
ALTER TABLE "SuggestionMatch" ADD CONSTRAINT "SuggestionMatch_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionMatch" ADD CONSTRAINT "SuggestionMatch_featureRequestId_fkey" FOREIGN KEY ("featureRequestId") REFERENCES "FeatureRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
