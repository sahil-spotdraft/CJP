import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { OrgCreateSidebar } from "@/components/hub/org-create-sidebar";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function OrgsPage() {
  const orgs = await prisma.customerOrg.findMany({
    include: {
      channels: true,
      _count: { select: { signals: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer orgs"
        description="Map each customer workspace and its Slack channels."
        actions={<OrgCreateSidebar />}
      />

      {orgs.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--ink-muted)]">
          No orgs yet. Click Add org to create one.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/orgs/${org.id}`}
              className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--accent)]"
            >
              <h2 className="text-lg font-semibold">{org.name}</h2>
              <p className="text-sm text-[var(--ink-muted)]">{org.slug}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>{org.channels.length} channels</Badge>
                <Badge>{org._count.signals} signals</Badge>
                <Badge>ARR: {org.arr != null ? `$${org.arr.toLocaleString()}` : "—"}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
