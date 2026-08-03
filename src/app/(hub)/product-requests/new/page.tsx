import Link from "next/link";
import { prisma } from "@/lib/db";
import { listCsOwners } from "@/lib/services/cs-owner";
import { ProductRequestCreateForm } from "@/components/hub/product-request-create-form";

export const dynamic = "force-dynamic";

export default async function CreateFeatureRequestPage() {
  const [orgs, consolidations, csOwners] = await Promise.all([
    prisma.customerOrg.findMany({ orderBy: { name: "asc" } }),
    prisma.consolidation.findMany({ orderBy: { name: "asc" } }),
    listCsOwners(),
  ]);

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
          Capture a CLM ask from a workspace. Consolidation and CS owner are both required.
        </p>
      </div>

      <ProductRequestCreateForm
        orgs={orgs}
        consolidations={consolidations.map((c) => ({
          id: c.id,
          name: c.name,
          notes: c.notes,
        }))}
        csOwners={csOwners.map((o) => ({ id: o.id, name: o.name, email: o.email }))}
        redirectTo="/"
      />
    </div>
  );
}
