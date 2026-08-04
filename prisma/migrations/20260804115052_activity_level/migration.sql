-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');

-- AlterTable
ALTER TABLE "FeatureRequestActivity" ADD COLUMN     "level" "ActivityLevel" NOT NULL DEFAULT 'INFO';

-- CreateIndex
CREATE INDEX "FeatureRequestActivity_level_idx" ON "FeatureRequestActivity"("level");
