import {
  PrismaClient,
  FeatureRequestStatus,
  FeatureSignalStatus,
  ClmPriority,
  ClmRequestStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertOrg(params: { slug: string; name: string; arr: number }) {
  return prisma.customerOrg.upsert({
    where: { slug: params.slug },
    update: { name: params.name, arr: params.arr },
    create: { name: params.name, slug: params.slug, arr: params.arr },
  });
}

async function upsertConsolidation(name: string, feature?: string) {
  return prisma.consolidation.upsert({
    where: { name },
    update: { feature: feature ?? undefined },
    create: { name, feature: feature ?? undefined },
  });
}

async function upsertProductRequest(params: {
  id: string;
  orgId: string;
  ask: string;
  consolidationId: string;
  csOwner: string;
  priority: ClmPriority;
  status: ClmRequestStatus;
  productNotes?: string;
  timeline?: string;
  csNotes?: string;
}) {
  return prisma.productRequest.upsert({
    where: { id: params.id },
    update: {
      orgId: params.orgId,
      ask: params.ask,
      consolidationId: params.consolidationId,
      csOwner: params.csOwner,
      priority: params.priority,
      status: params.status,
      productNotes: params.productNotes ?? null,
      timeline: params.timeline ?? null,
      csNotes: params.csNotes ?? null,
    },
    create: {
      id: params.id,
      orgId: params.orgId,
      ask: params.ask,
      consolidationId: params.consolidationId,
      csOwner: params.csOwner,
      priority: params.priority,
      status: params.status,
      productNotes: params.productNotes,
      timeline: params.timeline,
      csNotes: params.csNotes,
    },
  });
}

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

  // Keep existing demo orgs for Slack inbox flow
  const acme = await upsertOrg({ slug: "acme", name: "Acme Corp", arr: 345800 });
  const globex = await upsertOrg({ slug: "globex", name: "Globex", arr: 237750 });

  // Accounts from the Product Requests CLM sheet screenshot
  const versant = await upsertOrg({ slug: "versant", name: "Versant", arr: 166688 });
  const ocrolus = await upsertOrg({ slug: "ocrolus", name: "Ocrolus", arr: 72250 });
  const twelveLabs = await upsertOrg({ slug: "twelve-labs", name: "Twelve Labs", arr: 35150 });
  const tennr = await upsertOrg({ slug: "tennr", name: "Tennr", arr: 29600 });

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

  const consolidations = {
    initiatingContracts: await upsertConsolidation(
      "Initiating New Contracts from existing page",
      "Contracts",
    ),
    legalUserAssignment: await upsertConsolidation("Legal User assignment", "Access control"),
    sfdcFieldLock: await upsertConsolidation("SFDC Field-Level Lock/Hide Controls", "Salesforce"),
    signatureFields: await upsertConsolidation("Additional Fields - Signature blocks", "Signature"),
    approvals: await upsertConsolidation("Approvals", "Approvals"),
    versionDeletion: await upsertConsolidation("Version Deletion", "Document versioning"),
  };

  await upsertProductRequest({
    id: "seed_pr_versant_initiating_contracts",
    orgId: versant.id,
    ask: "No capability to auto-generate SOWs from MSAs, requiring manual recreation of terms for every project which is inefficient and error-prone. Currently you have to initiate contract from Home and can't initiate new contract from Existing Contracts page.",
    consolidationId: consolidations.initiatingContracts.id,
    csOwner: "Shubham",
    priority: ClmPriority.CRITICAL,
    status: ClmRequestStatus.DISCUSSED_WITH_PRODUCT,
  });

  await upsertProductRequest({
    id: "seed_pr_versant_legal_user_assignment",
    orgId: versant.id,
    ask: "Requirement to support a User question type for Legal Owner and Legal Reviewer so users can be assigned on the intake / questionnaire form itself.",
    consolidationId: consolidations.legalUserAssignment.id,
    csOwner: "Shubham",
    priority: ClmPriority.CRITICAL,
    status: ClmRequestStatus.DISCUSSED_WITH_PRODUCT,
  });

  await upsertProductRequest({
    id: "seed_pr_ocrolus_sfdc_field_lock",
    orgId: ocrolus.id,
    ask: "Ability to lock certain SFDC mapped fields when creating a contract",
    consolidationId: consolidations.sfdcFieldLock.id,
    csOwner: "Pooja",
    priority: ClmPriority.CRITICAL,
    status: ClmRequestStatus.IN_ROADMAP,
  });

  await upsertProductRequest({
    id: "seed_pr_ocrolus_signature_email",
    orgId: ocrolus.id,
    ask: "Ability to have email ID as a field in the signature blocks",
    consolidationId: consolidations.signatureFields.id,
    csOwner: "Pooja",
    priority: ClmPriority.LOW,
    status: ClmRequestStatus.NEW,
  });

  await upsertProductRequest({
    id: "seed_pr_twelve_labs_signature_email",
    orgId: twelveLabs.id,
    ask: "Ability to have email ID as a field in the signature blocks",
    consolidationId: consolidations.signatureFields.id,
    csOwner: "Vanshika",
    priority: ClmPriority.HIGH,
    status: ClmRequestStatus.NEW,
  });

  await upsertProductRequest({
    id: "seed_pr_tennr_signature_email",
    orgId: tennr.id,
    ask: "Ability to have email ID as a field in the signature blocks",
    consolidationId: consolidations.signatureFields.id,
    csOwner: "Vanshika",
    priority: ClmPriority.HIGH,
    status: ClmRequestStatus.NEW,
  });

  await upsertProductRequest({
    id: "seed_pr_ocrolus_approvals",
    orgId: ocrolus.id,
    ask: "Is there a way to turn off the feature where users can upload executed copies of documents? Customers want only Admins and Legal to have this ability.",
    consolidationId: consolidations.approvals.id,
    csOwner: "Pooja",
    priority: ClmPriority.LOW,
    status: ClmRequestStatus.DISCUSSED_WITH_PRODUCT,
    productNotes: "this should be approval needed",
  });

  await upsertProductRequest({
    id: "seed_pr_acme_version_deletion",
    orgId: acme.id,
    ask: "Allow deleting an individual document version instead of the whole history.",
    consolidationId: consolidations.versionDeletion.id,
    csOwner: "Jamie Lee",
    priority: ClmPriority.HIGH,
    status: ClmRequestStatus.DISCUSSED_WITH_PRODUCT,
    productNotes: "Scoped for the versioning revamp; needs audit-log follow-up.",
    timeline: "2026-Q4",
    csNotes: "Blocking a compliance workflow for this account.",
  });

  await upsertProductRequest({
    id: "seed_pr_globex_version_deletion",
    orgId: globex.id,
    ask: "Need to purge outdated contract versions to stay under storage limits.",
    consolidationId: consolidations.versionDeletion.id,
    csOwner: "Priya Nair",
    priority: ClmPriority.HIGH,
    status: ClmRequestStatus.NEW,
    timeline: "2026-Q4",
    csNotes: "Came up during QBR renewal discussion.",
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
