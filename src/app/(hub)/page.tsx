import Link from "next/link";
import { listProductRequests, serializeProductRequest } from "@/lib/services/consolidation";
import { ProductRequestsHomeTable } from "@/components/hub/product-requests-home-table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const requests = await listProductRequests();

  const wsByConsolidation = new Map<string, string[]>();
  for (const r of requests) {
    if (!r.consolidationId) continue;
    const list = wsByConsolidation.get(r.consolidationId) ?? [];
    if (!list.includes(r.org.name)) list.push(r.org.name);
    wsByConsolidation.set(r.consolidationId, list);
  }

  const rows = requests.map((r) => {
    const serialized = serializeProductRequest(r);
    const relatedWsNames = r.consolidationId
      ? (wsByConsolidation.get(r.consolidationId) ?? [r.org.name]).slice().sort((a, b) => a.localeCompare(b))
      : [r.org.name];
    return {
      id: serialized.id,
      wsId: serialized.wsId,
      wsName: serialized.wsName,
      ask: serialized.ask,
      consolidation: serialized.consolidation,
      relatedWsNames,
      csOwner: serialized.csOwner,
      priority: serialized.priority,
      status: serialized.status,
      productNotes: serialized.productNotes,
      timeline: serialized.timeline,
      csNotes: serialized.csNotes,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Feature requests</h1>
          <p className="mt-1 text-[var(--ink-muted)]">
            Feature request is first; WS Name shows every workspace on that feature. Click a row to
            open its detail page.
          </p>
        </div>
        <Link href="/product-requests/new">
          <Button>Create feature request</Button>
        </Link>
      </div>

      <ProductRequestsHomeTable requests={rows} />
    </div>
  );
}
