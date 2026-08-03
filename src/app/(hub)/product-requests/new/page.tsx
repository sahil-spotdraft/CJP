import Link from "next/link";
import { prisma } from "@/lib/db";
import { ProductRequestCreateForm } from "@/components/hub/product-request-create-form";

export const dynamic = "force-dynamic";

export default async function CreateFeatureRequestPage() {
  const [orgs, ownerRows] = await Promise.all([
    prisma.customerOrg.findMany({ orderBy: { name: "asc" } }),
    prisma.productRequest.findMany({
      where: { csOwner: { not: null } },
      select: { csOwner: true },
      distinct: ["csOwner"],
      orderBy: { csOwner: "asc" },
    }),
  ]);
  const csOwners = ownerRows
    .map((r) => r.csOwner)
    .filter((name): name is string => Boolean(name));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-[var(--accent)] underline">
          ← Back to feature requests
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl">
          Create feature request
        </h1>
        <p className="mt-1 text-[var(--ink-muted)]">
          Capture a CLM ask from a workspace. You can assign it to a consolidation afterward.
        </p>
      </div>

      <ProductRequestCreateForm orgs={orgs} csOwners={csOwners} redirectTo="/" />
    </div>
  );
}
