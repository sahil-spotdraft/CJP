import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getProductRequest, serializeProductRequest } from "@/lib/services/consolidation";
import { FeatureRequestDetailClient } from "@/components/hub/feature-request-detail-client";

export const dynamic = "force-dynamic";

export default async function FeatureRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [raw, orgs, consolidations, ownerRows] = await Promise.all([
    getProductRequest(id),
    prisma.customerOrg.findMany({ orderBy: { name: "asc" } }),
    prisma.consolidation.findMany({ orderBy: { name: "asc" } }),
    prisma.productRequest.findMany({
      where: { csOwner: { not: null } },
      select: { csOwner: true },
      distinct: ["csOwner"],
      orderBy: { csOwner: "asc" },
    }),
  ]);
  if (!raw) notFound();
  const request = serializeProductRequest(raw);
  const csOwners = ownerRows
    .map((r) => r.csOwner)
    .filter((name): name is string => Boolean(name));

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
        consolidations={consolidations.map((c) => ({ id: c.id, name: c.name }))}
        csOwners={csOwners}
        requestingCustomers={requestingCustomers}
      />
    </div>
  );
}
