import { PrismaClient, FeatureRequestStatus, FeatureSignalStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@moonshot.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const name = process.env.ADMIN_NAME || "Admin";

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name },
  });

  await prisma.appSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      confidenceThreshold: Number(process.env.CLASSIFIER_CONFIDENCE_THRESHOLD || 0.7),
      threadReplyEnabled: true,
    },
  });

  const acme = await prisma.customerOrg.upsert({
    where: { slug: "acme" },
    update: {},
    create: { name: "Acme Corp", slug: "acme" },
  });

  const globex = await prisma.customerOrg.upsert({
    where: { slug: "globex" },
    update: {},
    create: { name: "Globex", slug: "globex" },
  });

  const acmeChannel = await prisma.slackChannel.upsert({
    where: { channelId: "C_ACME_SUPPORT" },
    update: { name: "acme-support", orgId: acme.id, enabled: true },
    create: {
      channelId: "C_ACME_SUPPORT",
      name: "acme-support",
      orgId: acme.id,
      enabled: true,
    },
  });

  await prisma.slackChannel.upsert({
    where: { channelId: "C_GLOBEX_SUPPORT" },
    update: { name: "globex-support", orgId: globex.id, enabled: true },
    create: {
      channelId: "C_GLOBEX_SUPPORT",
      name: "globex-support",
      orgId: globex.id,
      enabled: true,
    },
  });

  const exportCsv = await prisma.featureRequest.upsert({
    where: { id: "seed_export_csv" },
    update: {},
    create: {
      id: "seed_export_csv",
      title: "Export reports to CSV",
      summary: "Customers want to download analytics reports as CSV for offline analysis.",
      status: FeatureRequestStatus.TRIAGED,
    },
  });

  await prisma.tag.upsert({
    where: { name: "reporting" },
    update: {},
    create: { name: "reporting" },
  });

  const reporting = await prisma.tag.findUniqueOrThrow({ where: { name: "reporting" } });
  await prisma.featureRequestTag.upsert({
    where: {
      featureRequestId_tagId: {
        featureRequestId: exportCsv.id,
        tagId: reporting.id,
      },
    },
    update: {},
    create: {
      featureRequestId: exportCsv.id,
      tagId: reporting.id,
    },
  });

  await prisma.roadmapItem.upsert({
    where: { id: "seed_roadmap_q3" },
    update: {},
    create: {
      id: "seed_roadmap_q3",
      title: "Reporting upgrades",
      theme: "Insights",
      quarter: "2026-Q3",
      description: "Make customer reporting more flexible and exportable.",
    },
  });

  await prisma.featureRequest.update({
    where: { id: exportCsv.id },
    data: { roadmapId: "seed_roadmap_q3" },
  });

  await prisma.featureSignal.upsert({
    where: {
      channelId_slackTs: {
        channelId: acmeChannel.id,
        slackTs: "1700000000.000100",
      },
    },
    update: {},
    create: {
      status: FeatureSignalStatus.PENDING,
      rawText:
        "Would be great if we could export our weekly reports to CSV. Right now we have to screenshot everything.",
      aiTitle: "CSV export for weekly reports",
      aiSummary: "Customer wants CSV export for weekly reports instead of screenshots.",
      aiConfidence: 0.91,
      aiTags: ["reporting", "export"],
      slackUserId: "U_ACME_1",
      slackUserName: "jordan",
      slackTs: "1700000000.000100",
      threadTs: "1700000000.000100",
      permalink: "https://slack.com/app_redirect?channel=C_ACME_SUPPORT",
      orgId: acme.id,
      channelId: acmeChannel.id,
    },
  });

  await prisma.featureRequestNote.upsert({
    where: { id: "seed_note_1" },
    update: {},
    create: {
      id: "seed_note_1",
      featureRequestId: exportCsv.id,
      authorId: admin.id,
      body: "Multiple enterprise accounts asked for this during Q2 QBRs.",
    },
  });

  console.log(`Seed complete. Admin login: ${email} / ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
