import { prisma } from "@/lib/db";
import { listProductRequests } from "@/lib/services/consolidation";
import { ProductRequestsTable } from "@/components/hub/product-requests-table";

export const dynamic = "force-dynamic";

export default async function FeatureRequestsPage() {
  const [requests, consolidations] = await Promise.all([
    listProductRequests(),
    prisma.consolidation.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Feature requests</h1>
        <p className="mt-1 text-[var(--ink-muted)]">
          Asks tracked from CS/CLM conversations. Assign each ask to a{" "}
          <span className="font-medium text-[var(--ink)]">Consolidation</span> bucket to roll up ARR
          across every workspace asking for the same feature.
        </p>
      </div>

      <ProductRequestsTable
        requests={requests.map((r) => ({
          ...r,
          org: { id: r.org.id, name: r.org.name, arr: r.org.arr },
          consolidation: r.consolidation ? { id: r.consolidation.id, name: r.consolidation.name } : null,
          featureRequest: r.featureRequest
            ? { id: r.featureRequest.id, title: r.featureRequest.title }
            : null,
        }))}
        consolidations={consolidations.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
