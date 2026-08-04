/**
 * Add one FeatureRequestActivity from data/activities.json.
 *
 * Activities are generic templates (no requestId in JSON).
 * You pass activity id + any FeatureRequest or ProductRequest id.
 * If the request already has linked sources, the activity attaches to a
 * matching existing source (SLACK/JIRA by kind) — it does not create channels.
 *
 *      npm run demo:activity -- <activity-id> <feature-or-product-request-id>
 *
 * Examples:
 *      npm run demo:activity -- be-spec-done seed_pr_tennr_signature_email
 *      npm run demo:activity -- blocker-escalation fr_sfdc_field_lock
 *
 * List available ids:
 *      npm run demo:activity
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ActivityLevel,
  FeatureRequestActivityKind,
  FeatureRequestSourceType,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

type ActivitySeed = {
  id: string;
  kind?: keyof typeof FeatureRequestActivityKind;
  level?: keyof typeof ActivityLevel;
  title: string;
  /** Prefer `lines` (no \\n in JSON). `body` still accepted. */
  lines?: string[];
  body?: string;
  occurredAt?: string;
};

type ActivitiesFile = {
  activities: ActivitySeed[];
};

function loadActivities(): ActivitySeed[] {
  const filePath = resolve(process.cwd(), "data/activities.json");
  const raw = readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as ActivitiesFile;
  return parsed.activities ?? [];
}

function bodyFromEntry(entry: ActivitySeed): string | null {
  if (Array.isArray(entry.lines) && entry.lines.length > 0) {
    return entry.lines.join("\n");
  }
  if (entry.body?.trim()) return entry.body.trim();
  return null;
}

function printUsage(activities: ActivitySeed[]) {
  console.log(
    "Usage: npm run demo:activity -- <activity-id> <feature-or-product-request-id>\n",
  );
  console.log(
    "Activities are generic — they attach to whatever request id you pass.\n" +
      "Product-request URLs like /product-requests/seed_pr_tennr_signature_email work;\n" +
      "activities store on the linked FeatureRequest (fr_*).\n",
  );
  console.log("Available entries:");
  for (const a of activities) {
    console.log(`  ${a.id}  [${a.level ?? "INFO"}]  —  ${a.title}`);
  }
}

async function resolveFeatureRequestId(inputId: string): Promise<{
  featureRequestId: string;
  title: string;
  via: string;
}> {
  const feature = await prisma.featureRequest.findUnique({
    where: { id: inputId },
  });
  if (feature) {
    return {
      featureRequestId: feature.id,
      title: feature.title,
      via: "FeatureRequest",
    };
  }

  const product = await prisma.productRequest.findUnique({
    where: { id: inputId },
    include: { consolidation: true },
  });
  if (!product) {
    throw new Error(
      `No FeatureRequest or ProductRequest found for id: ${inputId}.`,
    );
  }

  const linked =
    product.featureRequestId ?? product.consolidation?.featureRequestId ?? null;
  if (!linked) {
    throw new Error(
      `ProductRequest ${inputId} has no linked FeatureRequest. Promote its consolidation first.`,
    );
  }

  const linkedFeature = await prisma.featureRequest.findUnique({
    where: { id: linked },
  });
  if (!linkedFeature) {
    throw new Error(
      `ProductRequest ${inputId} points at missing FeatureRequest ${linked}.`,
    );
  }

  return {
    featureRequestId: linkedFeature.id,
    title: linkedFeature.title,
    via: `ProductRequest ${inputId}`,
  };
}

async function resolveExistingSource(
  featureRequestId: string,
  kind: FeatureRequestActivityKind,
) {
  const preferredType =
    kind === FeatureRequestActivityKind.JIRA
      ? FeatureRequestSourceType.JIRA
      : kind === FeatureRequestActivityKind.SLACK
        ? FeatureRequestSourceType.SLACK
        : null;

  const sources = await prisma.featureRequestSource.findMany({
    where: { featureRequestId },
    orderBy: { createdAt: "asc" },
  });

  if (preferredType) {
    const match = sources.find((s) => s.type === preferredType);
    if (match) return match;
  }

  return sources[0] ?? null;
}

async function seedOneActivity(entry: ActivitySeed, inputRequestId: string) {
  const resolved = await resolveFeatureRequestId(inputRequestId);
  const featureRequestId = resolved.featureRequestId;
  // Scope template id per request so the same generic activity can land on many requests.
  const activityRowId = `${entry.id}__${featureRequestId}`;

  const existing = await prisma.featureRequestActivity.findUnique({
    where: { id: activityRowId },
  });
  if (existing) {
    console.log(`Already in DB: ${entry.id} on ${featureRequestId} — ${entry.title}`);
    console.log(`  row id: ${existing.id}`);
    console.log(`  level:  ${existing.level}`);
    console.log(`Open /product-requests/${inputRequestId} to view it.`);
    return;
  }

  const kind =
    FeatureRequestActivityKind[entry.kind ?? "SLACK"] ?? FeatureRequestActivityKind.SLACK;
  const level = ActivityLevel[entry.level ?? "INFO"] ?? ActivityLevel.INFO;

  const linkedSource = await resolveExistingSource(featureRequestId, kind);
  const sourceId = linkedSource?.id ?? null;
  if (!linkedSource) {
    console.log(
      `No linked source on ${featureRequestId}; activity will have no source link.`,
    );
  }

  const occurredAt = entry.occurredAt ? new Date(entry.occurredAt) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error(`Invalid occurredAt for activity ${entry.id}: ${entry.occurredAt}`);
  }

  const activity = await prisma.featureRequestActivity.create({
    data: {
      id: activityRowId,
      featureRequestId,
      kind,
      level,
      title: entry.title,
      body: bodyFromEntry(entry),
      occurredAt,
      sourceId,
    },
  });

  console.log("Activity created:");
  console.log(`  template:        ${entry.id}`);
  console.log(`  row id:          ${activity.id}`);
  console.log(`  featureRequest:  ${featureRequestId} (${resolved.title})`);
  console.log(`  resolved via:    ${resolved.via}`);
  console.log(`  level:           ${activity.level}`);
  console.log(`  title:           ${activity.title}`);
  if (linkedSource) {
    console.log(`  source:          ${linkedSource.type} ${linkedSource.label}`);
  }
  console.log(`Open /product-requests/${inputRequestId} — Activity timeline should refresh.`);
}

async function main() {
  const activities = loadActivities();
  const activityId = process.argv[2]?.trim();
  const requestId = process.argv[3]?.trim();

  if (!activityId || !requestId) {
    if (activityId && !requestId) {
      console.error("Missing <request-id>.\n");
    }
    printUsage(activities);
    process.exit(activityId && !requestId ? 1 : 0);
  }

  const entry = activities.find((a) => a.id === activityId);
  if (!entry) {
    console.error(`Unknown activity id: ${activityId}\n`);
    printUsage(activities);
    process.exit(1);
  }

  await seedOneActivity(entry, requestId);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
