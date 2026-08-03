import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MAP: Record<string, { id: string; title: string; summary: string }> = {
  "Initiating New Contracts from existing page": {
    id: "fr_initiating_contracts",
    title: "Initiate new contracts from Existing Contracts page",
    summary:
      "Allow generating SOWs from MSAs and starting new contracts from the Existing Contracts page instead of only from Home.",
  },
  "Legal User assignment": {
    id: "fr_legal_user_assignment",
    title: "Legal Owner / Reviewer user question type on intake",
    summary:
      "Support a User question type for Legal Owner and Legal Reviewer so assignees can be set on the intake / questionnaire form.",
  },
  "SFDC Field-Level Lock/Hide Controls": {
    id: "fr_sfdc_field_lock",
    title: "Lock or hide SFDC-mapped fields on contract create",
    summary:
      "Ability to lock or hide certain Salesforce-mapped fields when creating a contract.",
  },
  "Additional Fields - Signature blocks": {
    id: "fr_signature_fields",
    title: "Email ID field in signature blocks",
    summary:
      "Ability to include email ID as a field in signature blocks on contracts.",
  },
  Approvals: {
    id: "fr_approvals_executed_upload",
    title: "Restrict upload of executed document copies",
    summary:
      "Control who can upload executed copies of documents — limit to Admins and Legal via an approval/permission gate.",
  },
  "Version Deletion": {
    id: "fr_version_deletion",
    title: "Delete individual document versions",
    summary:
      "Allow deleting an individual document version instead of the whole history, including purge for storage limits.",
  },
};

async function main() {
  const consolidations = await prisma.consolidation.findMany();
  for (const c of consolidations) {
    const meta = MAP[c.name];
    if (!meta) {
      console.log("skip (no map):", c.name);
      continue;
    }
    const fr = await prisma.featureRequest.upsert({
      where: { id: meta.id },
      update: { title: meta.title, summary: meta.summary },
      create: { id: meta.id, title: meta.title, summary: meta.summary },
    });
    if (!c.featureRequestId) {
      await prisma.consolidation.update({
        where: { id: c.id },
        data: { featureRequestId: fr.id },
      });
    }
    console.log("ok:", meta.id, "←", c.name);
  }

  const all = await prisma.featureRequest.findMany({ orderBy: { title: "asc" } });
  console.log("\nAll FeatureRequests:");
  for (const r of all) {
    console.log(`  ${r.id} | ${r.status} | ${r.title}`);
  }
}
main().finally(() => prisma.$disconnect());
