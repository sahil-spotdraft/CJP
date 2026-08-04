import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getProductRequest, serializeProductRequest } from "@/lib/services/consolidation";
import { listCsOwners } from "@/lib/services/cs-owner";
import { FeatureRequestDetailClient } from "@/components/hub/feature-request-detail-client";

export const dynamic = "force-dynamic";

export default async function FeatureRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [raw, orgs, consolidations, csOwners] = await Promise.all([
    getProductRequest(id),
    prisma.customerOrg.findMany({ orderBy: { name: "asc" } }),
    prisma.consolidation.findMany({ orderBy: { name: "asc" } }),
    listCsOwners(),
  ]);
  if (!raw) notFound();
  const request = serializeProductRequest(raw);

  const relatedRequests = raw.consolidationId
    ? await prisma.productRequest.findMany({
        where: { consolidationId: raw.consolidationId },
        include: { org: true },
        orderBy: { updatedAt: "desc" },
      })
    : [raw];

  const customersById = new Map<
    string,
    { id: string; name: string; arr: number | null; ask: string | null }
  >();
  for (const r of relatedRequests) {
    if (customersById.has(r.org.id)) continue;
    customersById.set(r.org.id, {
      id: r.org.id,
      name: r.org.name,
      arr: r.org.arr,
      ask: r.ask,
    });
  }
  const requestingCustomers = [...customersById.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const linkedFeatureRequestId =
    raw.featureRequestId ?? raw.consolidation?.featureRequestId ?? null;

  const linkedFeature = linkedFeatureRequestId
    ? await prisma.featureRequest.findUnique({
        where: { id: linkedFeatureRequestId },
        include: {
          sources: { orderBy: { createdAt: "desc" } },
          activities: {
            include: {
              author: { select: { id: true, name: true, email: true } },
              source: true,
            },
            orderBy: { occurredAt: "desc" },
          },
        },
      })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-[var(--accent)] underline">
          ← Back to feature requests
        </Link>
      </div>

      <FeatureRequestDetailClient
        detail={request}
        orgs={orgs.map((o) => ({ id: o.id, name: o.name, arr: o.arr }))}
        consolidations={consolidations.map((c) => ({
          id: c.id,
          name: c.name,
          notes: c.notes,
        }))}
        csOwners={csOwners.map((o) => ({ id: o.id, name: o.name, email: o.email }))}
        requestingCustomers={requestingCustomers}
        linkedFeature={
          linkedFeature
            ? {
                id: linkedFeature.id,
                title: linkedFeature.title,
                status: linkedFeature.status,
                dueDate: linkedFeature.dueDate?.toISOString() ?? null,
                sources: linkedFeature.sources.map((s) => ({
                  id: s.id,
                  type: s.type,
                  label: s.label,
                  url: s.url,
                  externalId: s.externalId,
                })),
                activities: linkedFeature.activities.map((a) => ({
                  id: a.id,
                  kind: a.kind,
                  level: a.level,
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
              }
            : null
        }
      />
    </div>
  );
}
