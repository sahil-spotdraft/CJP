import {
  ClmRequestStatus,
  FeatureRequestStatus,
  FeatureSignalStatus,
  Prisma,
  SuggestionTriageStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";

const orgSelect = {
  id: true,
  name: true,
  slug: true,
  arr: true,
} as const;

const matchInclude = {
  featureRequest: {
    select: {
      id: true,
      title: true,
      summary: true,
      status: true,
      createdAt: true,
      tags: { include: { tag: true } },
      productRequests: {
        select: { org: { select: orgSelect } },
      },
      consolidation: {
        select: {
          requests: {
            select: { org: { select: orgSelect } },
          },
        },
      },
      signals: {
        where: { status: FeatureSignalStatus.MATCHED },
        select: { org: { select: orgSelect } },
      },
    },
  },
} satisfies Prisma.SuggestionMatchInclude;

type OrgRow = { id: string; name: string; slug: string; arr: number | null };

function uniqueOrgs(orgs: OrgRow[]) {
  return [...new Map(orgs.map((o) => [o.id, o])).values()];
}

function orgsForFeatureRequest(fr: {
  productRequests: { org: OrgRow }[];
  consolidation: { requests: { org: OrgRow }[] } | null;
  signals: { org: OrgRow }[];
}) {
  return uniqueOrgs([
    ...fr.productRequests.map((p) => p.org),
    ...(fr.consolidation?.requests.map((r) => r.org) ?? []),
    ...fr.signals.map((s) => s.org),
  ]);
}

export function serializeSuggestionMatch(match: {
  id: string;
  matchPercent: number;
  featureRequest: {
    id: string;
    title: string;
    summary: string;
    status: string;
    createdAt: Date;
    tags: { tag: { name: string } }[];
    productRequests: { org: OrgRow }[];
    consolidation: { requests: { org: OrgRow }[] } | null;
    signals: { org: OrgRow }[];
  };
}) {
  const workspaces = orgsForFeatureRequest(match.featureRequest);
  return {
    id: match.id,
    matchPercent: match.matchPercent,
    featureRequest: {
      id: match.featureRequest.id,
      title: match.featureRequest.title,
      summary: match.featureRequest.summary,
      status: match.featureRequest.status,
      createdAt: match.featureRequest.createdAt.toISOString(),
      tags: match.featureRequest.tags.map((t) => t.tag.name),
      workspaces: workspaces.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        arr: o.arr,
      })),
    },
  };
}

export function serializeSuggestionListItem(suggestion: {
  id: string;
  title: string;
  summary: string;
  status: string;
  sourceLabel: string;
  readAt: Date | null;
  createdAt: Date;
  triageStatus: SuggestionTriageStatus;
  featureRequestId: string | null;
  _count: { matches: number };
}) {
  return {
    id: suggestion.id,
    title: suggestion.title,
    summary: suggestion.summary,
    status: suggestion.status,
    sourceLabel: suggestion.sourceLabel,
    readAt: suggestion.readAt?.toISOString() ?? null,
    createdAt: suggestion.createdAt.toISOString(),
    matchCount: suggestion._count.matches,
    unread: suggestion.readAt == null,
    triageStatus: suggestion.triageStatus,
    featureRequestId: suggestion.featureRequestId,
  };
}

export async function listSuggestions() {
  const suggestions = await prisma.suggestion.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: { select: { matches: true } },
    },
  });

  const unreadCount = suggestions.filter((s) => s.readAt == null).length;

  return {
    unreadCount,
    suggestions: suggestions.map(serializeSuggestionListItem),
  };
}

export async function getSuggestionDetail(id: string) {
  const suggestion = await prisma.suggestion.findUnique({
    where: { id },
    include: {
      matches: {
        include: matchInclude,
        orderBy: { matchPercent: "desc" },
      },
      orgs: { include: { org: { select: orgSelect } } },
      featureRequest: { select: { id: true, title: true } },
    },
  });

  if (!suggestion) return null;

  const allOrgs = await prisma.customerOrg.findMany({
    select: orgSelect,
    orderBy: { name: "asc" },
  });

  const requestingOrgIds = suggestion.orgs.map((o) => o.orgId);

  let productRequestId: string | null = null;
  if (suggestion.featureRequestId) {
    const preferred = requestingOrgIds.length
      ? await prisma.productRequest.findFirst({
          where: {
            featureRequestId: suggestion.featureRequestId,
            orgId: { in: requestingOrgIds },
          },
          orderBy: { updatedAt: "desc" },
        })
      : null;
    const fallback =
      preferred ??
      (await prisma.productRequest.findFirst({
        where: { featureRequestId: suggestion.featureRequestId },
        orderBy: { updatedAt: "desc" },
      }));
    productRequestId = fallback?.id ?? null;
  }

  return {
    id: suggestion.id,
    title: suggestion.title,
    summary: suggestion.summary,
    status: suggestion.status,
    rawText: suggestion.rawText,
    sourceLabel: suggestion.sourceLabel,
    tags: suggestion.tags,
    readAt: suggestion.readAt?.toISOString() ?? null,
    createdAt: suggestion.createdAt.toISOString(),
    updatedAt: suggestion.updatedAt.toISOString(),
    unread: suggestion.readAt == null,
    triageStatus: suggestion.triageStatus,
    triageNote: suggestion.triageNote,
    featureRequestId: suggestion.featureRequestId,
    productRequestId,
    featureRequest: suggestion.featureRequest,
    requestingWorkspaces: suggestion.orgs.map((o) => ({
      id: o.org.id,
      name: o.org.name,
      slug: o.org.slug,
      arr: o.org.arr,
    })),
    allWorkspaces: allOrgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      arr: o.arr,
    })),
    matches: suggestion.matches.map(serializeSuggestionMatch),
  };
}

export async function markSuggestionRead(id: string) {
  const existing = await prisma.suggestion.findUnique({ where: { id } });
  if (!existing) return null;

  if (!existing.readAt) {
    await prisma.suggestion.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  return getSuggestionDetail(id);
}

async function attachWorkspacesToRequest(params: {
  featureRequestId: string;
  orgIds: string[];
  ask: string;
  authorId?: string;
}) {
  const uniqueOrgIds = [...new Set(params.orgIds.filter(Boolean))];
  if (uniqueOrgIds.length === 0) return;

  const orgs = await prisma.customerOrg.findMany({
    where: { id: { in: uniqueOrgIds } },
  });
  if (orgs.length === 0) return;

  const featureRequest = await prisma.featureRequest.findUniqueOrThrow({
    where: { id: params.featureRequestId },
    include: { consolidation: true },
  });

  let consolidationId = featureRequest.consolidation?.id ?? null;

  // Ensure the feature request has a consolidation bucket so workspaces
  // show up the same way as CLM product-request groups.
  if (!consolidationId) {
    const baseName = params.ask.trim().slice(0, 80) || featureRequest.title;
    let name = baseName;
    let suffix = 2;
    while (await prisma.consolidation.findUnique({ where: { name } })) {
      name = `${baseName} (${suffix})`;
      suffix += 1;
    }
    const consolidation = await prisma.consolidation.create({
      data: {
        name,
        featureRequestId: featureRequest.id,
      },
    });
    consolidationId = consolidation.id;
  } else if (!featureRequest.consolidation?.featureRequestId) {
    await prisma.consolidation.update({
      where: { id: consolidationId },
      data: { featureRequestId: featureRequest.id },
    });
  }

  for (const org of orgs) {
    const existingForOrg = await prisma.productRequest.findFirst({
      where: {
        orgId: org.id,
        OR: [
          { featureRequestId: featureRequest.id },
          { consolidationId },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    if (existingForOrg) {
      await prisma.productRequest.update({
        where: { id: existingForOrg.id },
        data: {
          featureRequestId: featureRequest.id,
          consolidationId,
        },
      });
    } else {
      await prisma.productRequest.create({
        data: {
          orgId: org.id,
          ask: params.ask,
          featureRequestId: featureRequest.id,
          consolidationId,
          status: ClmRequestStatus.DISCUSSED_WITH_PRODUCT,
        },
      });
    }
  }

  const names = orgs.map((o) => o.name).join(", ");
  await prisma.featureRequestNote.create({
    data: {
      featureRequestId: params.featureRequestId,
      body: `Workspaces added from suggestion: ${names}`,
      authorId: params.authorId,
    },
  });
}

export async function matchSuggestionToRequest(params: {
  suggestionId: string;
  featureRequestId: string;
  workspaceIds?: string[];
  note?: string;
  authorId?: string;
}) {
  const suggestion = await prisma.suggestion.findUniqueOrThrow({
    where: { id: params.suggestionId },
    include: { orgs: true },
  });

  if (suggestion.triageStatus !== SuggestionTriageStatus.PENDING) {
    throw new Error("Suggestion is no longer pending");
  }

  const request = await prisma.featureRequest.findUniqueOrThrow({
    where: { id: params.featureRequestId },
  });

  const workspaceIds =
    params.workspaceIds && params.workspaceIds.length > 0
      ? params.workspaceIds
      : suggestion.orgs.map((o) => o.orgId);

  await prisma.$transaction(async (tx) => {
    await tx.suggestion.update({
      where: { id: suggestion.id },
      data: {
        triageStatus: SuggestionTriageStatus.MATCHED,
        featureRequestId: request.id,
        triageNote: params.note?.trim() || null,
        readAt: suggestion.readAt ?? new Date(),
      },
    });

    if (params.note?.trim()) {
      await tx.featureRequestNote.create({
        data: {
          featureRequestId: request.id,
          body: params.note.trim(),
          authorId: params.authorId,
        },
      });
    }

    await tx.featureRequest.update({
      where: { id: request.id },
      data: { updatedAt: new Date() },
    });
  });

  await attachWorkspacesToRequest({
    featureRequestId: request.id,
    orgIds: workspaceIds,
    ask: suggestion.title,
    authorId: params.authorId,
  });

  return getSuggestionDetail(suggestion.id);
}

export async function createRequestFromSuggestion(params: {
  suggestionId: string;
  title: string;
  summary: string;
  tags?: string[];
  workspaceIds?: string[];
  note?: string;
  authorId?: string;
}) {
  const suggestion = await prisma.suggestion.findUniqueOrThrow({
    where: { id: params.suggestionId },
    include: { orgs: true },
  });

  if (suggestion.triageStatus !== SuggestionTriageStatus.PENDING) {
    throw new Error("Suggestion is no longer pending");
  }

  const workspaceIds =
    params.workspaceIds && params.workspaceIds.length > 0
      ? params.workspaceIds
      : suggestion.orgs.map((o) => o.orgId);

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.featureRequest.create({
      data: {
        title: params.title.trim(),
        summary: params.summary.trim(),
        status: FeatureRequestStatus.NEW,
      },
    });

    if (params.tags?.length) {
      for (const name of params.tags) {
        const tag = await tx.tag.upsert({
          where: { name: name.trim().toLowerCase() },
          create: { name: name.trim().toLowerCase() },
          update: {},
        });
        await tx.featureRequestTag.create({
          data: { featureRequestId: created.id, tagId: tag.id },
        });
      }
    }

    if (params.note?.trim()) {
      await tx.featureRequestNote.create({
        data: {
          featureRequestId: created.id,
          body: params.note.trim(),
          authorId: params.authorId,
        },
      });
    }

    await tx.suggestion.update({
      where: { id: suggestion.id },
      data: {
        triageStatus: SuggestionTriageStatus.CREATED,
        featureRequestId: created.id,
        triageNote: params.note?.trim() || null,
        readAt: suggestion.readAt ?? new Date(),
      },
    });

    return created;
  });

  await attachWorkspacesToRequest({
    featureRequestId: request.id,
    orgIds: workspaceIds,
    ask: params.title.trim(),
    authorId: params.authorId,
  });

  return getSuggestionDetail(suggestion.id);
}
