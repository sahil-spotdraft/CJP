import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductRequest, serializeProductRequest } from "@/lib/services/consolidation";
import { Badge } from "@/components/ui/badge";
import { ClmPriorityBadge, ClmStatusBadge } from "@/components/hub/status-badge";

export const dynamic = "force-dynamic";

function formatArr(value: number | null) {
  if (value == null) return "—";
  return `$${value.toLocaleString()}`;
}

export default async function ProductRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await getProductRequest(id);
  if (!raw) notFound();
  const request = serializeProductRequest(raw);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-[var(--accent)] underline">
          ← Back to feature requests
        </Link>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">Request / Ask</p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl">{request.ask}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ClmStatusBadge status={request.status} />
            {request.priority ? <ClmPriorityBadge priority={request.priority} /> : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="WS Name" value={request.wsName} />
          <Field label="Account ARR" value={formatArr(request.accountArr)} />
          <Field label="CS Owner" value={request.csOwner || "—"} />
          <Field label="Timeline" value={request.timeline || "—"} />
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">Consolidation</p>
            {request.consolidation ? (
              <Link
                href={`/consolidation/${request.consolidation.id}`}
                className="mt-1 inline-block font-medium text-[var(--accent)] underline"
              >
                {request.consolidation.name}
              </Link>
            ) : (
              <p className="mt-1">—</p>
            )}
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">Feature request</p>
            {request.featureRequest ? (
              <Link
                href={`/requests/${request.featureRequest.id}`}
                className="mt-1 inline-block font-medium text-[var(--accent)] underline"
              >
                {request.featureRequest.title}
              </Link>
            ) : (
              <p className="mt-1 text-[var(--ink-muted)]">Not linked yet</p>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <NoteBlock title="Product notes" body={request.productNotes} />
          <NoteBlock title="CS notes" body={request.csNotes} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>WS Name: {request.wsName}</Badge>
          <Badge>{formatArr(request.accountArr)} ARR</Badge>
          {request.consolidation?.feature ? (
            <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
              {request.consolidation.feature}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">{label}</p>
      <p className={`mt-1 ${mono ? "font-mono text-xs" : "font-medium"}`}>{value}</p>
    </div>
  );
}

function NoteBlock({ title, body }: Readonly<{ title: string; body: string | null }>) {
  return (
    <div className="rounded-xl bg-[var(--surface-2)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm">{body || "—"}</p>
    </div>
  );
}
