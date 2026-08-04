/**
 * Add one FeatureRequestActivity from data/activities.json.
 * Looks up the JSON entry by activity id, verifies the FeatureRequest exists,
 * then inserts into the DB (idempotent by activity id).
 *
 * Demo flow:
 *   1. Copy the activity `body` from data/activities.json
 *   2. Paste it into Slack (for the pitch)
 *   3. Run:
 *
 *      npm run demo:activity -- <activity-id> <request-id>
 *
 * Example:
 *      npm run demo:activity -- sfdc-be-spec-done fr_sfdc_field_lock
 *
 * List available ids:
 *      npm run demo:activity
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  FeatureRequestActivityKind,
  FeatureRequestSourceType,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

type ActivitySeed = {
  id: string;
  requestId: string;
  kind?: keyof typeof FeatureRequestActivityKind;
  title: string;
  body: string;
  occurredAt?: string;
  sourceLabel?: string;
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

function printUsage(activities: ActivitySeed[]) {
  console.log("Usage: npm run demo:activity -- <activity-id> <request-id>\n");
  console.log("Available entries:");

  const byRequest = new Map<string, ActivitySeed[]>();
  for (const a of activities) {
    const list = byRequest.get(a.requestId) ?? [];
    list.push(a);
    byRequest.set(a.requestId, list);
  }

  for (const [requestId, list] of [...byRequest.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    console.log(`  ${requestId}`);
    for (const a of list) {
      console.log(`    ${a.id}  —  ${a.title}`);
    }
  }
}

async function ensureSlackSource(featureRequestId: string, label: string) {
  const existing = await prisma.featureRequestSource.findFirst({
    where: {
      featureRequestId,
      type: FeatureRequestSourceType.SLACK,
      label,
    },
  });
  if (existing) return existing;

  return prisma.featureRequestSource.create({
    data: {
      featureRequestId,
      type: FeatureRequestSourceType.SLACK,
      label,
      url: `https://slack.com/app_redirect?channel=${encodeURIComponent(label.replace(/^#/, ""))}`,
    },
  });
}

async function seedOneActivity(entry: ActivitySeed, requestId: string) {
  const request = await prisma.featureRequest.findUnique({ where: { id: requestId } });
  if (!request) {
    throw new Error(
      `FeatureRequest not found: ${requestId}. Promote/seed requests first, or fix the request id.`,
    );
  }

  if (entry.requestId !== requestId) {
    throw new Error(
      `Request id mismatch: JSON entry "${entry.id}" is for "${entry.requestId}", ` +
        `but you passed "${requestId}".`,
    );
  }

  const existing = await prisma.featureRequestActivity.findUnique({
    where: { id: entry.id },
  });
  if (existing) {
    console.log(`Already in DB: ${entry.id} — ${entry.title}`);
    console.log(`  request: ${existing.featureRequestId}`);
    console.log(`Open /requests/${existing.featureRequestId} to view it.`);
    return;
  }

  const kind =
    FeatureRequestActivityKind[entry.kind ?? "SLACK"] ?? FeatureRequestActivityKind.SLACK;

  let sourceId: string | null = null;
  if (entry.sourceLabel?.trim()) {
    const source = await ensureSlackSource(requestId, entry.sourceLabel.trim());
    sourceId = source.id;
  }

  const occurredAt = entry.occurredAt ? new Date(entry.occurredAt) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error(`Invalid occurredAt for activity ${entry.id}: ${entry.occurredAt}`);
  }

  const activity = await prisma.featureRequestActivity.create({
    data: {
      id: entry.id,
      featureRequestId: requestId,
      kind,
      title: entry.title,
      body: entry.body,
      occurredAt,
      sourceId,
    },
  });

  console.log("Activity created from JSON:");
  console.log(`  id:       ${activity.id}`);
  console.log(`  request:  ${requestId} (${request.title})`);
  console.log(`  title:    ${activity.title}`);
  console.log(`  kind:     ${activity.kind}`);
  console.log(`Open /requests/${requestId} or a linked product-request — Activity should refresh.`);
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
