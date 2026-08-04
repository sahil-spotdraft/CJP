import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { RequestDetailClient } from "@/components/hub/request-detail-client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const [request, roadmapOptions] = await Promise.all([
    prisma.featureRequest.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        votes: { include: { user: true } },
        notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
        roadmap: true,
        signals: {
          include: { org: true, channel: true },
          orderBy: { createdAt: "desc" },
        },
        productRequests: { include: { org: true } },
        consolidation: {
          include: { requests: { include: { org: true } } },
        },
        sources: { orderBy: { createdAt: "desc" } },
        activities: {
          include: {
            author: { select: { id: true, name: true, email: true } },
            source: true,
          },
          orderBy: { occurredAt: "desc" },
        },
      },
    }),
    prisma.roadmapItem.findMany({ orderBy: { title: "asc" } }),
  ]);

  if (!request || !session?.user?.id) notFound();

  const workspaces = [
    ...new Map(
      [
        ...request.signals.map((s) => s.org),
        ...request.productRequests.map((p) => p.org),
        ...(request.consolidation?.requests.map((r) => r.org) ?? []),
      ].map((org) => [org.id, org]),
    ).values(),
  ];

  return (
    <RequestDetailClient
      detail={{
        id: request.id,
        title: request.title,
        summary: request.summary,
        status: request.status,
        dueDate: request.dueDate?.toISOString() ?? null,
        tags: request.tags,
        votes: request.votes,
        notes: request.notes.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        })),
        signals: request.signals.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
        })),
        sources: request.sources.map((s) => ({
          id: s.id,
          type: s.type,
          label: s.label,
          url: s.url,
          externalId: s.externalId,
        })),
        activities: request.activities.map((a) => ({
          id: a.id,
          kind: a.kind,
          title: a.title,
          body: a.body,
          occurredAt: a.occurredAt.toISOString(),
          sourceId: a.sourceId,
          source: a.source
            ? {
                id: a.source.id,
                type: a.source.type,
                label: a.source.label,
                url: a.source.url,
                externalId: a.source.externalId,
              }
            : null,
          author: a.author,
        })),
        workspaces,
        roadmap: request.roadmap,
        currentUserId: session.user.id,
        roadmapOptions,
      }}
    />
  );
}
