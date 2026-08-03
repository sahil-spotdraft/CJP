/**
 * Create a Suggestion from data/suggestions.json by id.
 * Links to existing FeatureRequest rows only — does not create requests.
 * Attaches requesting workspaces from JSON (upserts org by slug if needed).
 *
 * Demo flow:
 *   1. Copy `slackMessage` for an entry in data/suggestions.json
 *   2. Paste it into Slack (for the pitch)
 *   3. Run:
 *
 *      npm run demo:suggestion -- ceracare-counterparty-id
 *
 * List available ids:
 *      npm run demo:suggestion
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  FeatureRequestStatus,
  PrismaClient,
  SuggestionTriageStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

type LinkedRequest = {
  id: string;
  title: string;
  summary: string;
  status: keyof typeof FeatureRequestStatus;
  matchPercent: number;
};

type WorkspaceSeed = {
  slug: string;
  name: string;
  arr?: number;
};

type SuggestionSeed = {
  id: string;
  title: string;
  summary: string;
  status: keyof typeof FeatureRequestStatus;
  sourceLabel: string;
  tags: string[];
  slackMessage: string;
  workspaces?: WorkspaceSeed[];
  linkedRequests: LinkedRequest[];
};

type SuggestionsFile = {
  suggestions: SuggestionSeed[];
};

function loadSuggestions(): SuggestionSeed[] {
  const filePath = resolve(process.cwd(), "data/suggestions.json");
  const raw = readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as SuggestionsFile;
  return parsed.suggestions ?? [];
}

function printUsage(suggestions: SuggestionSeed[]) {
  console.log("Usage: npm run demo:suggestion -- <suggestion-id>\n");
  console.log("Available ids:");
  for (const s of suggestions) {
    const matchCount = s.linkedRequests?.length ?? 0;
    const wsCount = s.workspaces?.length ?? 0;
    console.log(
      `  - ${s.id}  (${matchCount} linked, ${wsCount} workspace${wsCount === 1 ? "" : "s"})`,
    );
  }
}

async function resolveWorkspaceIds(workspaces: WorkspaceSeed[]) {
  const ids: string[] = [];
  for (const ws of workspaces) {
    const org = await prisma.customerOrg.upsert({
      where: { slug: ws.slug },
      update: {
        name: ws.name,
        ...(typeof ws.arr === "number" ? { arr: ws.arr } : {}),
      },
      create: {
        slug: ws.slug,
        name: ws.name,
        arr: ws.arr,
      },
    });
    ids.push(org.id);
  }
  return ids;
}

async function seedSuggestion(entry: SuggestionSeed) {
  const linked = entry.linkedRequests ?? [];

  const missing: string[] = [];
  for (const match of linked) {
    const existing = await prisma.featureRequest.findUnique({
      where: { id: match.id },
    });
    if (!existing) missing.push(match.id);
  }
  if (missing.length > 0) {
    throw new Error(
      `Linked FeatureRequest id(s) not found in DB: ${missing.join(", ")}. ` +
        `Update data/suggestions.json to use existing request ids.`,
    );
  }

  const orgIds = await resolveWorkspaceIds(entry.workspaces ?? []);

  await prisma.suggestionOrg.deleteMany({ where: { suggestionId: entry.id } });
  await prisma.suggestionMatch.deleteMany({ where: { suggestionId: entry.id } });
  await prisma.suggestion.deleteMany({ where: { id: entry.id } });

  const status = FeatureRequestStatus[entry.status] ?? FeatureRequestStatus.NEW;

  const suggestion = await prisma.suggestion.create({
    data: {
      id: entry.id,
      title: entry.title,
      summary: entry.summary,
      status,
      sourceLabel: entry.sourceLabel || "slack",
      rawText: entry.slackMessage,
      tags: entry.tags ?? [],
      readAt: null,
      triageStatus: SuggestionTriageStatus.PENDING,
      featureRequestId: null,
      triageNote: null,
      matches: {
        create: linked.map((match) => ({
          featureRequestId: match.id,
          matchPercent: match.matchPercent,
        })),
      },
      orgs: {
        create: orgIds.map((orgId) => ({ orgId })),
      },
    },
    include: {
      matches: {
        include: { featureRequest: true },
        orderBy: { matchPercent: "desc" },
      },
      orgs: { include: { org: true } },
    },
  });

  console.log("Suggestion created from JSON (linked to existing requests):");
  console.log(`  id:       ${suggestion.id}`);
  console.log(`  title:    ${suggestion.title}`);
  console.log(`  matches:  ${suggestion.matches.length}`);
  for (const m of suggestion.matches) {
    console.log(`    - ${m.matchPercent}%  ${m.featureRequest.title} (${m.featureRequestId})`);
  }
  console.log(`  workspaces: ${suggestion.orgs.map((o) => o.org.name).join(", ") || "(none)"}`);
  console.log("Open Home — the notification bell should pick it up within a few seconds.");
}

async function main() {
  const suggestions = loadSuggestions();
  const id = process.argv[2]?.trim();

  if (!id) {
    printUsage(suggestions);
    process.exit(0);
  }

  const entry = suggestions.find((s) => s.id === id);
  if (!entry) {
    console.error(`Unknown suggestion id: ${id}\n`);
    printUsage(suggestions);
    process.exit(1);
  }

  await seedSuggestion(entry);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
