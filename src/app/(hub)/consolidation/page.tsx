import Link from "next/link";
import { listConsolidationsWithArr } from "@/lib/services/consolidation";
import { Badge } from "@/components/ui/badge";
import { ConsolidationCreateSidebar } from "@/components/hub/consolidation-create-sidebar";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

function formatArr(value: number) {
  return `$${value.toLocaleString()}`;
}

export default async function ConsolidationPage() {
  const { rows, grandTotal } = await listConsolidationsWithArr();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consolidation"
        description="Feature asks consolidated across workspaces, with ARR summed across every distinct workspace requesting each one — asking for the same feature from a new workspace grows the total."
        actions={<ConsolidationCreateSidebar />}
      />

      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left">
              <th className="px-4 py-3 text-label">Consolidation</th>
              <th className="px-4 py-3 text-label">Feature</th>
              <th className="px-4 py-3 text-label">Notes</th>
              <th className="px-4 py-3 text-label">Workspaces</th>
              <th className="px-4 py-3 text-label">Feature request</th>
              <th className="px-4 py-3 text-right text-label">SUM of Account ARR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/consolidation/${row.id}`} className="font-medium text-[var(--accent)] underline">
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--ink-muted)]">{row.feature || "—"}</td>
                <td className="max-w-xs px-4 py-3 text-[var(--ink-muted)]">
                  {row.notes ? <span className="line-clamp-2">{row.notes}</span> : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.orgs.map((org) => (
                      <Badge key={org.id}>{org.name}</Badge>
                    ))}
                    {row.orgs.length === 0 ? <span className="text-[var(--ink-muted)]">—</span> : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {row.featureRequest ? (
                    <Link href={`/requests/${row.featureRequest.id}`} className="text-[var(--accent)] underline">
                      {row.featureRequest.title}
                    </Link>
                  ) : (
                    <span className="text-[var(--ink-muted)]">Not promoted</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium">{formatArr(row.arr)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[var(--ink-muted)]">
                  No consolidations yet. Click Add consolidation to create one.
                </td>
              </tr>
            ) : null}
          </tbody>
          {rows.length > 0 ? (
            <tfoot>
              <tr className="border-t-2 border-[var(--ink)] bg-[var(--surface-2)] font-semibold">
                <td className="px-4 py-3" colSpan={5}>
                  Grand Total
                </td>
                <td className="px-4 py-3 text-right">{formatArr(grandTotal)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
