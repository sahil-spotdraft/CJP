import Link from "next/link";
import {
  groupProductRequestsForHome,
  listProductRequests,
} from "@/lib/services/consolidation";
import { ProductRequestsHomeTable } from "@/components/hub/product-requests-home-table";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const requests = await listProductRequests();
  const rows = groupProductRequestsForHome(requests);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature requests"
        description="One row per consolidation; WS Name lists every workspace on that feature. Click a row to open its detail page."
        actions={
          <Link href="/product-requests/new">
            <Button>Create feature request</Button>
          </Link>
        }
      />

      <ProductRequestsHomeTable requests={rows} />
    </div>
  );
}
