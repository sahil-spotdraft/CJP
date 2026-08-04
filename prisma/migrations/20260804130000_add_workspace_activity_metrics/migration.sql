-- CreateTable
CREATE TABLE "WorkspaceActivityMetric" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "activityKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "priorCount" INTEGER NOT NULL DEFAULT 0,
    "periodDays" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceActivityMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceActivityMetric_orgId_idx" ON "WorkspaceActivityMetric"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceActivityMetric_orgId_activityKey_key" ON "WorkspaceActivityMetric"("orgId", "activityKey");

-- AddForeignKey
ALTER TABLE "WorkspaceActivityMetric" ADD CONSTRAINT "WorkspaceActivityMetric_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "CustomerOrg"("id") ON DELETE CASCADE ON UPDATE CASCADE;
