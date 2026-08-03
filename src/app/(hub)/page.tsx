import Link from "next/link";
import {
  groupProductRequestsForHome,
  listProductRequests,
} from "@/lib/services/consolidation";
import { ProductRequestsHomeTable } from "@/components/hub/product-requests-home-table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const requests = await listProductRequests();
  const rows = groupProductRequestsForHome(requests);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Feature requests</h1>
          <p className="mt-1 text-[var(--ink-muted)]">
            One row per consolidation; WS Name lists every workspace on that feature. Click a row to
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
