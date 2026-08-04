import {
  ActivityLevel,
  FeatureRequestActivityKind,
  FeatureRequestSourceType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import activitiesFile from "../../../data/activities.json";

export type ActivityTemplate = {
  id: string;
  kind?: keyof typeof FeatureRequestActivityKind;
  level?: keyof typeof ActivityLevel;
  title: string;
  lines?: string[];
  body?: string;
  occurredAt?: string;
};

type ActivitiesFile = {
  activities: ActivityTemplate[];
};

const catalog = (activitiesFile as ActivitiesFile).activities ?? [];

export function listActivityTemplates(): ActivityTemplate[] {
  return catalog;
}

export function pickRandomActivityTemplate(
  excludeIds: Set<string> = new Set(),
): ActivityTemplate | null {
  if (catalog.length === 0) return null;

  const unused = catalog.filter((a) => !excludeIds.has(a.id));
  const pool = unused.length > 0 ? unused : catalog;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

function bodyFromTemplate(entry: ActivityTemplate): string | null {
  if (Array.isArray(entry.lines) && entry.lines.length > 0) {
    return entry.lines.join("\n");
  }
  if (entry.body?.trim()) return entry.body.trim();
  return null;
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

/**
 * Pull a random demo activity template onto a feature request,
 * linking it to an existing source on that request (no Slack push).
 */
export async function pullRandomActivityFromSource(params: {
  featureRequestId: string;
  authorId?: string | null;
}) {
  const request = await prisma.featureRequest.findUnique({
    where: { id: params.featureRequestId },
    include: { sources: true },
  });
  if (!request) {
    throw new Error("Feature request not found");
  }
  if (request.sources.length === 0) {
    throw new Error(
      "Add a linked source on this request first, then pull activity from it.",
    );
  }

  const existing = await prisma.featureRequestActivity.findMany({
    where: { featureRequestId: params.featureRequestId },
    select: { id: true },
  });
  const usedTemplateIds = new Set(
    existing
      .map((a) => a.id.split("__")[0])
      .filter((id): id is string => Boolean(id)),
  );

  const template = pickRandomActivityTemplate(usedTemplateIds);
  if (!template) {
    throw new Error("No activity templates available in data/activities.json");
  }

  const kind =
    FeatureRequestActivityKind[template.kind ?? "SLACK"] ??
    FeatureRequestActivityKind.SLACK;
  const level =
    ActivityLevel[template.level ?? "INFO"] ?? ActivityLevel.INFO;

  const linkedSource = await resolveExistingSource(params.featureRequestId, kind);

  const occurredAt = template.occurredAt
    ? new Date(template.occurredAt)
    : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error(`Invalid occurredAt on template ${template.id}`);
  }

  // Unique row each click so the same template can be pulled more than once.
  const activityRowId = `${template.id}__${params.featureRequestId}__${Date.now().toString(36)}`;

  try {
    return await prisma.featureRequestActivity.create({
      data: {
        id: activityRowId,
        featureRequestId: params.featureRequestId,
        kind,
        level,
        title: template.title,
        body: bodyFromTemplate(template),
        occurredAt,
        sourceId: linkedSource?.id ?? null,
        authorId: params.authorId ?? null,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        source: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("Could not create activity; try again");
    }
    throw error;
  }
}
