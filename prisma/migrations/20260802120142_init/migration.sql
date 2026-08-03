-- CreateEnum
CREATE TYPE "FeatureRequestStatus" AS ENUM ('NEW', 'TRIAGED', 'PLANNED', 'IN_PROGRESS', 'SHIPPED', 'DECLINED');

-- CreateEnum
CREATE TYPE "FeatureSignalStatus" AS ENUM ('PENDING', 'MATCHED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ClassificationJobStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOrg" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerOrg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlackChannel" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlackChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureRequest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "FeatureRequestStatus" NOT NULL DEFAULT 'NEW',
    "embedding" JSONB,
    "roadmapId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureSignal" (
    "id" TEXT NOT NULL,
    "status" "FeatureSignalStatus" NOT NULL DEFAULT 'PENDING',
    "rawText" TEXT NOT NULL,
    "aiTitle" TEXT,
    "aiSummary" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "aiTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "slackUserId" TEXT,
    "slackUserName" TEXT,
    "slackTs" TEXT NOT NULL,
    "threadTs" TEXT,
    "botReplyTs" TEXT,
    "permalink" TEXT,
    "triageNote" TEXT,
    "orgId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "featureRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureRequestNote" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "featureRequestId" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureRequestNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureRequestTag" (
    "featureRequestId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "FeatureRequestTag_pkey" PRIMARY KEY ("featureRequestId","tagId")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "featureRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "theme" TEXT,
    "quarter" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificationJob" (
    "id" TEXT NOT NULL,
    "status" "ClassificationJobStatus" NOT NULL DEFAULT 'PENDING',
    "model" TEXT,
    "prompt" TEXT,
    "responseJson" JSONB,
    "error" TEXT,
    "signalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassificationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "confidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "threadReplyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerOrg_slug_key" ON "CustomerOrg"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SlackChannel_channelId_key" ON "SlackChannel"("channelId");

-- CreateIndex
CREATE INDEX "SlackChannel_orgId_idx" ON "SlackChannel"("orgId");

-- CreateIndex
CREATE INDEX "FeatureRequest_status_idx" ON "FeatureRequest"("status");

-- CreateIndex
CREATE INDEX "FeatureRequest_roadmapId_idx" ON "FeatureRequest"("roadmapId");

-- CreateIndex
CREATE INDEX "FeatureSignal_status_idx" ON "FeatureSignal"("status");

-- CreateIndex
CREATE INDEX "FeatureSignal_orgId_idx" ON "FeatureSignal"("orgId");

-- CreateIndex
CREATE INDEX "FeatureSignal_featureRequestId_idx" ON "FeatureSignal"("featureRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureSignal_channelId_slackTs_key" ON "FeatureSignal"("channelId", "slackTs");

-- CreateIndex
CREATE INDEX "FeatureRequestNote_featureRequestId_idx" ON "FeatureRequestNote"("featureRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_featureRequestId_userId_key" ON "Vote"("featureRequestId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassificationJob_signalId_key" ON "ClassificationJob"("signalId");

-- AddForeignKey
ALTER TABLE "SlackChannel" ADD CONSTRAINT "SlackChannel_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "CustomerOrg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureRequest" ADD CONSTRAINT "FeatureRequest_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "RoadmapItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureSignal" ADD CONSTRAINT "FeatureSignal_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "CustomerOrg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureSignal" ADD CONSTRAINT "FeatureSignal_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "SlackChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureSignal" ADD CONSTRAINT "FeatureSignal_featureRequestId_fkey" FOREIGN KEY ("featureRequestId") REFERENCES "FeatureRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureRequestNote" ADD CONSTRAINT "FeatureRequestNote_featureRequestId_fkey" FOREIGN KEY ("featureRequestId") REFERENCES "FeatureRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureRequestNote" ADD CONSTRAINT "FeatureRequestNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureRequestTag" ADD CONSTRAINT "FeatureRequestTag_featureRequestId_fkey" FOREIGN KEY ("featureRequestId") REFERENCES "FeatureRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureRequestTag" ADD CONSTRAINT "FeatureRequestTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_featureRequestId_fkey" FOREIGN KEY ("featureRequestId") REFERENCES "FeatureRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationJob" ADD CONSTRAINT "ClassificationJob_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "FeatureSignal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
