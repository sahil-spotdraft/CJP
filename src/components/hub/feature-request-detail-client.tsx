"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClmPriority, ClmRequestStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ClmPriorityBadge, ClmStatusBadge } from "@/components/hub/status-badge";
import { cn } from "@/lib/utils";
import { formatCsOwnerLabel } from "@/lib/cs-owner-label";

const statuses = Object.values(ClmRequestStatus);
const priorities = Object.values(ClmPriority);

type OrgOption = { id: string; name: string; arr: number | null };
type ConsolidationOption = { id: string; name: string; notes?: string | null };
type CsOwnerOption = { id: string; name: string; email: string };

type Detail = {
  id: string;
  ask: string;
  wsId: string;
  wsName: string;
  accountArr: number | null;
  csOwner: { id: string; name: string; email: string } | null;
  timeline: string | null;
  productNotes: string | null;
  csNotes: string | null;
  priority: ClmPriority | null;
  status: ClmRequestStatus;
  consolidation: { id: string; name: string; feature: string | null; notes?: string | null } | null;
  featureRequest: { id: string; title: string; status: string } | null;
};

type RequestingCustomer = {
  id: string;
  name: string;
  arr: number | null;
  ask: string | null;
};

export function FeatureRequestDetailClient({
  detail,
  orgs,
  consolidations,
  csOwners,
  requestingCustomers,
}: Readonly<{
  detail: Detail;
  orgs: OrgOption[];
  consolidations: ConsolidationOption[];
  csOwners: CsOwnerOption[];
  requestingCustomers: RequestingCustomer[];
}>) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ask, setAsk] = useState(detail.ask);
  const [workspaceIds, setWorkspaceIds] = useState<string[]>(
    requestingCustomers.map((c) => c.id),
  );
  const [consolidationId, setConsolidationId] = useState(detail.consolidation?.id ?? "");
  const [csOwnerId, setCsOwnerId] = useState(detail.csOwner?.id ?? "");
  const [timeline, setTimeline] = useState(detail.timeline ?? "");
  const [productNotes, setProductNotes] = useState(detail.productNotes ?? "");
  const [csNotes, setCsNotes] = useState(detail.csNotes ?? "");
  const [priority, setPriority] = useState(detail.priority ?? "");
  const [status, setStatus] = useState(detail.status);

  function resetFromDetail() {
    setAsk(detail.ask);
    setWorkspaceIds(requestingCustomers.map((c) => c.id));
    setConsolidationId(detail.consolidation?.id ?? "");
    setCsOwnerId(detail.csOwner?.id ?? "");
    setTimeline(detail.timeline ?? "");
    setProductNotes(detail.productNotes ?? "");
    setCsNotes(detail.csNotes ?? "");
    setPriority(detail.priority ?? "");
    setStatus(detail.status);
    setError(null);
  }

  function startEdit() {
    resetFromDetail();
    setEditing(true);
  }

  function cancelEdit() {
    resetFromDetail();
    setEditing(false);
  }

  function toggleWorkspace(orgId: string) {
    setWorkspaceIds((prev) => {
      if (prev.includes(orgId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== orgId);
      }
      return [...prev, orgId];
    });
  }

  async function save() {
    if (!ask.trim()) {
      setError("Request / Ask is required");
      return;
    }
    if (workspaceIds.length === 0) {
      setError("At least one workspace is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/product-requests/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ask: ask.trim(),
          consolidationId: consolidationId || null,
          csOwnerId: csOwnerId || null,
          timeline: timeline.trim() || null,
          productNotes: productNotes.trim() || null,
          csNotes: csNotes.trim() || null,
          priority: priority || null,
          status,
          workspaceIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setEditing(false);
      if (data.id && data.id !== detail.id) {
        router.push(`/product-requests/${data.id}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Edit feature request</h2>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={cancelEdit} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={busy || workspaceIds.length === 0}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="ask">Request / Ask</Label>
            <Textarea id="ask" rows={3} value={ask} onChange={(e) => setAsk(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <Label>Workspaces (requested by)</Label>
              <span className="text-xs text-[var(--ink-muted)]">
                {workspaceIds.length} selected · at least one required
              </span>
            </div>
            <div className="grid max-h-56 gap-2 overflow-y-auto rounded-xl border border-[var(--border)] bg-white p-3 sm:grid-cols-2">
              {orgs.map((org) => {
                const checked = workspaceIds.includes(org.id);
                const disableUncheck = checked && workspaceIds.length === 1;
                return (
                  <label
                    key={org.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                      checked
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]/50"
                        : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                      disableUncheck && "opacity-70",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disableUncheck}
                      onChange={() => toggleWorkspace(org.id)}
                    />
                    <span className="font-medium">{org.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="consolidationId">Consolidation</Label>
            <select
              id="consolidationId"
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={consolidationId}
              onChange={(e) => setConsolidationId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {consolidations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.notes ? ` — ${c.notes.slice(0, 40)}${c.notes.length > 40 ? "…" : ""}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="csOwnerId">CS Owner</Label>
            <select
              id="csOwnerId"
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={csOwnerId}
              onChange={(e) => setCsOwnerId(e.target.value)}
            >
              <option value="">None</option>
              {csOwners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {formatCsOwnerLabel(owner)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="timeline">Timeline</Label>
            <Input id="timeline" value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="2026-Q4" />
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="">None</option>
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as ClmRequestStatus)}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="productNotes">Product notes</Label>
            <Textarea id="productNotes" rows={4} value={productNotes} onChange={(e) => setProductNotes(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="csNotes">CS notes</Label>
            <Textarea id="csNotes" rows={4} value={csNotes} onChange={(e) => setCsNotes(e.target.value)} />
          </div>
        </div>

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">Request / Ask</p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl">{detail.ask}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ClmStatusBadge status={detail.status} />
            {detail.priority ? <ClmPriorityBadge priority={detail.priority} /> : null}
            <Button type="button" variant="secondary" onClick={startEdit}>
              Edit
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="CS Owner"
            value={detail.csOwner ? formatCsOwnerLabel(detail.csOwner) : "—"}
          />
          <Field label="Timeline" value={detail.timeline || "—"} />
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">Consolidation</p>
            {detail.consolidation ? (
              <Link
                href={`/consolidation/${detail.consolidation.id}`}
                className="mt-1 inline-block font-medium text-[var(--accent)] underline"
              >
                {detail.consolidation.name}
              </Link>
            ) : (
              <p className="mt-1">—</p>
            )}
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">Linked feature request</p>
            {detail.featureRequest ? (
              <Link
                href={`/requests/${detail.featureRequest.id}`}
                className="mt-1 inline-block font-medium text-[var(--accent)] underline"
              >
                {detail.featureRequest.title}
              </Link>
            ) : (
              <p className="mt-1 text-[var(--ink-muted)]">Not linked yet</p>
            )}
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl">
                Requested by customers
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                Workspaces asking for this feature
                {detail.consolidation ? ` (${detail.consolidation.name})` : ""}.
              </p>
            </div>
            <Badge>
              {requestingCustomers.length} workspace
              {requestingCustomers.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {requestingCustomers.map((customer) => (
              <div
                key={customer.id}
                className={cn(
                  "rounded-xl border bg-white px-4 py-3",
                  customer.id === detail.wsId
                    ? "border-[var(--accent)] shadow-sm"
                    : "border-[var(--border)]",
                )}
              >
                <p className="font-medium text-[var(--ink)]">{customer.name}</p>
                {customer.id === detail.wsId ? (
                  <p className="mt-2 text-xs font-medium text-[var(--accent)]">This request</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <NoteBlock title="Product notes" body={detail.productNotes} />
          <NoteBlock title="CS notes" body={detail.csNotes} />
        </div>

        {detail.consolidation?.feature ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
              {detail.consolidation.feature}
            </Badge>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
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
