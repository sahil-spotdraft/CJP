-- Deduplicate ProductRequest rows that share the same consolidation + workspace
-- (keep the oldest row per pair).
DELETE FROM "ProductRequest" a
USING "ProductRequest" b
WHERE a."consolidationId" IS NOT NULL
  AND a."consolidationId" = b."consolidationId"
  AND a."orgId" = b."orgId"
  AND a."createdAt" > b."createdAt";

-- Also remove any remaining ties (same createdAt) by keeping lower id
DELETE FROM "ProductRequest" a
USING "ProductRequest" b
WHERE a."consolidationId" IS NOT NULL
  AND a."consolidationId" = b."consolidationId"
  AND a."orgId" = b."orgId"
  AND a."id" > b."id";

-- CreateIndex
CREATE UNIQUE INDEX "ProductRequest_consolidationId_orgId_key" ON "ProductRequest"("consolidationId", "orgId");
