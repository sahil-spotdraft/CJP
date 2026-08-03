-- CreateTable
CREATE TABLE "CsOwner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CsOwner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CsOwner_email_key" ON "CsOwner"("email");

-- AlterTable
ALTER TABLE "Consolidation" ADD COLUMN "notes" TEXT;

-- AlterTable
ALTER TABLE "ProductRequest" ADD COLUMN "csOwnerId" TEXT;

-- Migrate existing free-text CS owner names into CsOwner rows (synthetic emails).
INSERT INTO "CsOwner" ("id", "name", "email", "createdAt", "updatedAt")
SELECT
  md5(TRIM("csOwner")),
  TRIM("csOwner"),
  lower(regexp_replace(TRIM("csOwner"), '[^a-zA-Z0-9]+', '.', 'g')) || '@cs.moonshot.local',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "ProductRequest"
WHERE "csOwner" IS NOT NULL AND TRIM("csOwner") <> ''
GROUP BY TRIM("csOwner");

UPDATE "ProductRequest" pr
SET "csOwnerId" = md5(TRIM(pr."csOwner"))
WHERE pr."csOwner" IS NOT NULL AND TRIM(pr."csOwner") <> '';

-- DropIndex / DropColumn for legacy free-text CS owner
ALTER TABLE "ProductRequest" DROP COLUMN "csOwner";

-- CreateIndex
CREATE INDEX "ProductRequest_csOwnerId_idx" ON "ProductRequest"("csOwnerId");

-- AddForeignKey
ALTER TABLE "ProductRequest" ADD CONSTRAINT "ProductRequest_csOwnerId_fkey" FOREIGN KEY ("csOwnerId") REFERENCES "CsOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
