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
      />
    </div>
  );
}
