import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const productRequestInclude = {
  org: true,
  consolidation: true,
  featureRequest: true,
} satisfies Prisma.ProductRequestInclude;

type ProductRequestWithRelations = Prisma.ProductRequestGetPayload<{
  include: typeof productRequestInclude;
}>;

/** Shape exposed by GET APIs and consumed by the Home / detail FE. */
export function serializeProductRequest(request: ProductRequestWithRelations) {
  return {
    id: request.id,
    wsId: request.org.id,
    wsName: request.org.name,
    account: request.org.name,
    accountArr: request.org.arr,
    ask: request.ask,
    consolidation: request.consolidation
      ? {
          id: request.consolidation.id,
          name: request.consolidation.name,
          feature: request.consolidation.feature,
        }
      : null,
    featureRequest: request.featureRequest
      ? {
          id: request.featureRequest.id,
          title: request.featureRequest.title,
          status: request.featureRequest.status,
        }
      : null,
    csOwner: request.csOwner,
    priority: request.priority,
    status: request.status,
    productNotes: request.productNotes,
    timeline: request.timeline,
    csNotes: request.csNotes,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

export async function listProductRequests() {
  return prisma.productRequest.findMany({
    include: productRequestInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProductRequest(id: string) {
  return prisma.productRequest.findUnique({
    where: { id },
    include: productRequestInclude,
  });
}

/**
 * ARR for a consolidation is derived, not stored: it's the sum of each
 * *distinct* workspace's ARR among the product requests linked to it. That
 * way asking for the same feature from a new workspace grows the total,
 * while a workspace asking for the same feature twice doesn't double count.
 */
export async function listConsolidationsWithArr() {
  const consolidations = await prisma.consolidation.findMany({
    include: {
      featureRequest: true,
      requests: { include: { org: true } },
    },
  });

  const rows = consolidations.map((c) => {
    const orgById = new Map(c.requests.map((r) => [r.org.id, r.org]));
    const orgs = [...orgById.values()];
    const arr = orgs.reduce((sum, org) => sum + (org.arr ?? 0), 0);
    return {
      id: c.id,
      name: c.name,
      feature: c.feature,
      featureRequest: c.featureRequest,
      requestCount: c.requests.length,
      orgs,
      arr,
      updatedAt: c.updatedAt,
    };
  });

  rows.sort((a, b) => b.arr - a.arr);
  const grandTotal = rows.reduce((sum, r) => sum + r.arr, 0);

  return { rows, grandTotal };
}

export async function getConsolidationDetail(id: string) {
  const consolidation = await prisma.consolidation.findUnique({
    where: { id },
    include: {
      featureRequest: true,
      requests: { include: productRequestInclude, orderBy: { createdAt: "desc" } },
    },
  });
  if (!consolidation) return null;

  const orgById = new Map(consolidation.requests.map((r) => [r.org.id, r.org]));
  const orgs = [...orgById.values()];
  const arr = orgs.reduce((sum, org) => sum + (org.arr ?? 0), 0);

  return { ...consolidation, orgs, arr };
}

export async function createProductRequest(params: {
  orgId: string;
  ask: string;
  csOwner?: string;
  priority?: string;
  status?: string;
  productNotes?: string;
  timeline?: string;
  csNotes?: string;
}) {
  return prisma.productRequest.create({
    data: {
      orgId: params.orgId,
      ask: params.ask.trim(),
      csOwner: params.csOwner?.trim() || undefined,
      priority: (params.priority as never) || undefined,
      status: (params.status as never) || undefined,
      productNotes: params.productNotes?.trim() || undefined,
      timeline: params.timeline?.trim() || undefined,
      csNotes: params.csNotes?.trim() || undefined,
    },
    include: productRequestInclude,
  });
}

export async function updateProductRequest(
  id: string,
  data: Partial<{
    ask: string;
    csOwner: string | null;
    priority: string | null;
    status: string;
    productNotes: string | null;
    timeline: string | null;
    csNotes: string | null;
    featureRequestId: string | null;
  }>,
) {
  return prisma.productRequest.update({
    where: { id },
    data: data as Prisma.ProductRequestUpdateInput,
    include: productRequestInclude,
  });
}

/**
 * Match a product request to an existing Consolidation bucket, or create a
 * new one by name (upserting on the unique name so re-using an existing
 * feature title reuses the same bucket instead of creating a duplicate).
 */
export async function consolidateProductRequest(params: {
  productRequestId: string;
  consolidationId?: string;
  newConsolidationName?: string;
  feature?: string;
}) {
  if (!params.consolidationId && !params.newConsolidationName?.trim()) {
    throw new Error("Provide either consolidationId or newConsolidationName");
  }

  const consolidation = params.consolidationId
    ? await prisma.consolidation.findUniqueOrThrow({ where: { id: params.consolidationId } })
    : await prisma.consolidation.upsert({
        where: { name: params.newConsolidationName!.trim() },
        update: {},
        create: {
          name: params.newConsolidationName!.trim(),
          feature: params.feature?.trim() || undefined,
        },
      });

  return prisma.productRequest.update({
    where: { id: params.productRequestId },
    data: { consolidationId: consolidation.id },
    include: productRequestInclude,
  });
}

export async function unconsolidateProductRequest(productRequestId: string) {
  return prisma.productRequest.update({
    where: { id: productRequestId },
    data: { consolidationId: null },
    include: productRequestInclude,
  });
}

/**
 * Promote a consolidation into the app's canonical FeatureRequest so it can
 * flow through the existing roadmap/status/voting pipeline alongside
 * Slack-sourced requests.
 */
export async function promoteConsolidationToFeatureRequest(params: {
  consolidationId: string;
  title?: string;
  summary?: string;
}) {
  const consolidation = await prisma.consolidation.findUniqueOrThrow({
    where: { id: params.consolidationId },
  });

  if (consolidation.featureRequestId) {
    throw new Error("Consolidation is already linked to a feature request");
  }

  const title = params.title?.trim() || consolidation.name;
  const summary =
    params.summary?.trim() ||
    (consolidation.feature
      ? `Consolidated CLM ask: ${consolidation.feature}`
      : `Consolidated CLM ask: ${consolidation.name}`);

  const featureRequest = await prisma.featureRequest.create({
    data: { title, summary },
  });

  await prisma.consolidation.update({
    where: { id: consolidation.id },
    data: { featureRequestId: featureRequest.id },
  });

  return featureRequest;
}
