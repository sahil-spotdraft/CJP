import Link from "next/link";
import { ClmPriority, ClmRequestStatus } from "@prisma/client";
import { ClmPriorityBadge, ClmStatusBadge } from "@/components/hub/status-badge";

export type ProductRequestRow = {
  id: string;
  wsId: string;
  wsName: string;
  account: string;
  accountArr: number | null;
  ask: string;
  consolidation: { id: string; name: string; feature: string | null } | null;
  featureRequest: { id: string; title: string; status: string } | null;
  csOwner: string | null;
  priority: ClmPriority | null;
  status: ClmRequestStatus;
  productNotes: string | null;
  timeline: string | null;
  csNotes: string | null;
};

function formatArr(value: number | null) {
  if (value == null) return "—";
  return `$${value.toLocaleString()}`;
}

export function ProductRequestsHomeTable({
  requests,
}: Readonly<{ requests: ProductRequestRow[] }>) {
  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--ink-muted)]">
        No feature requests yet.{" "}
        <Link href="/product-requests/new" className="text-[var(--accent)] underline">
          Create one
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--ink-muted)]">
            <th className="px-4 py-3 font-medium">WS Name</th>
            <th className="px-4 py-3 font-medium">Account ARR</th>
            <th className="px-4 py-3 font-medium">Request / Ask</th>
            <th className="px-4 py-3 font-medium">Consolidation</th>
            <th className="px-4 py-3 font-medium">Feature request</th>
            <th className="px-4 py-3 font-medium">CS Owner</th>
            <th className="px-4 py-3 font-medium">Priority</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Product Notes</th>
            <th className="px-4 py-3 font-medium">Timeline</th>
            <th className="px-4 py-3 font-medium">CS Notes</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((row) => (
            <tr key={row.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/70">
              <td className="px-4 py-3 font-medium">{row.wsName}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatArr(row.accountArr)}</td>
              <td className="px-4 py-3 max-w-[280px]">
                <Link href={`/product-requests/${row.id}`} className="font-medium text-[var(--accent)] underline-offset-2 hover:underline">
                  {row.ask}
                </Link>
              </td>
              <td className="px-4 py-3">
                {row.consolidation ? (
                  <Link href={`/consolidation/${row.consolidation.id}`} className="text-[var(--accent)] underline-offset-2 hover:underline">
                    {row.consolidation.name}
                  </Link>
                ) : (
                  <span className="text-[var(--ink-muted)]">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {row.featureRequest ? (
                  <Link href={`/requests/${row.featureRequest.id}`} className="text-[var(--accent)] underline-offset-2 hover:underline">
                    {row.featureRequest.title}
                  </Link>
                ) : (
                  <span className="text-[var(--ink-muted)]">—</span>
                )}
              </td>
              <td className="px-4 py-3">{row.csOwner || "—"}</td>
              <td className="px-4 py-3">
                {row.priority ? <ClmPriorityBadge priority={row.priority} /> : "—"}
              </td>
              <td className="px-4 py-3">
                <ClmStatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3 max-w-[180px] truncate text-[var(--ink-muted)]">
                {row.productNotes || "—"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{row.timeline || "—"}</td>
              <td className="px-4 py-3 max-w-[180px] truncate text-[var(--ink-muted)]">
                {row.csNotes || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
