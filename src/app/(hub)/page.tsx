import Link from "next/link";
import { listProductRequests, serializeProductRequest } from "@/lib/services/consolidation";
import { ProductRequestsHomeTable } from "@/components/hub/product-requests-home-table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const requests = (await listProductRequests()).map(serializeProductRequest);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Feature requests</h1>
          <p className="mt-1 text-[var(--ink-muted)]">
            CLM asks across workspaces. Click a request to open its detail page. Consolidation ARR
            is the sum of every distinct workspace&apos;s ARR asking for that feature.
          </p>
        </div>
        <Link href="/product-requests/new">
          <Button>Create feature request</Button>
        </Link>
      </div>

      <ProductRequestsHomeTable requests={requests} />
    </div>
  );
}
