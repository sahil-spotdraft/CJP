"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClmPriority, ClmRequestStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClmPriorityBadge, ClmStatusBadge } from "@/components/hub/status-badge";

type Org = { id: string; name: string; arr: number | null };
type Consolidation = { id: string; name: string };

type ProductRequest = {
  id: string;
  ask: string;
  csOwner: string | null;
  priority: ClmPriority | null;
  status: ClmRequestStatus;
  productNotes: string | null;
  timeline: string | null;
  csNotes: string | null;
  org: Org;
  consolidation: Consolidation | null;
  featureRequest: { id: string; title: string } | null;
};

const statuses = Object.values(ClmRequestStatus);
const priorities = Object.values(ClmPriority);

function formatArr(value: number | null) {
  if (value == null) return "—";
  return `$${value.toLocaleString()}`;
}

function ConsolidatePicker({
  requestId,
  consolidations,
  onDone,
}: Readonly<{
  requestId: string;
  consolidations: Consolidation[];
  onDone: () => void;
}>) {
  const [mode, setMode] = useState<"existing" | "new">(
    consolidations.length ? "existing" : "new",
  );
  const [existingId, setExistingId] = useState(consolidations[0]?.id ?? "");
  const [newName, setNewName] = useState("");
  const [feature, setFeature] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (mode === "existing" && !existingId) return;
    if (mode === "new" && !newName.trim()) return;
    setBusy(true);
    await fetch(`/api/product-requests/${requestId}/consolidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "existing"
          ? { consolidationId: existingId }
          : { newConsolidationName: newName, feature: feature || undefined },
      ),
    });
    setBusy(false);
    onDone();
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-[var(--surface-2)] p-2 text-sm">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={`rounded px-2 py-1 text-xs ${mode === "existing" ? "bg-[var(--accent)] text-white" : "bg-white"}`}
          disabled={!consolidations.length}
        >
          Existing
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          className={`rounded px-2 py-1 text-xs ${mode === "new" ? "bg-[var(--accent)] text-white" : "bg-white"}`}
        >
          New
        </button>
      </div>
      {mode === "existing" ? (
        <select
          className="rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-sm"
          value={existingId}
          onChange={(e) => setExistingId(e.target.value)}
        >
          {consolidations.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      ) : (
        <>
          <Input
            className="w-40"
            placeholder="Feature name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            className="w-36"
            placeholder="Feature area (optional)"
            value={feature}
            onChange={(e) => setFeature(e.target.value)}
          />
        </>
      )}
      <Button className="px-2.5 py-1.5 text-xs" onClick={submit} disabled={busy}>
        {busy ? "Saving…" : "Assign"}
      </Button>
    </div>
  );
}

function ProductRequestCard({
  request,
  consolidations,
}: Readonly<{
  request: ProductRequest;
  consolidations: Consolidation[];
}>) {
  const router = useRouter();
  const [status, setStatus] = useState(request.status);
  const [priority, setPriority] = useState(request.priority ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveMeta(next: { status?: ClmRequestStatus; priority?: string }) {
    setBusy(true);
    await fetch(`/api/product-requests/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: next.status ?? status,
        priority: (next.priority ?? priority) || null,
      }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href={`/product-requests/${request.id}`} className="max-w-2xl font-medium text-[var(--accent)] underline-offset-2 hover:underline">
          {request.ask}
        </Link>
        <div className="flex items-center gap-2">
          <ClmStatusBadge status={status} />
          {priority ? <ClmPriorityBadge priority={priority as ClmPriority} /> : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Badge>WS Name: {request.org.name}</Badge>
        <Badge>Account ARR: {formatArr(request.org.arr)}</Badge>
        {request.csOwner ? <Badge>CS: {request.csOwner}</Badge> : null}
        {request.timeline ? <Badge>{request.timeline}</Badge> : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {request.consolidation ? (
          <Link
            href={`/consolidation/${request.consolidation.id}`}
            className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]"
          >
            Consolidation: {request.consolidation.name}
          </Link>
        ) : (
          <Badge className="bg-amber-100 text-amber-900">Unconsolidated</Badge>
        )}
        <button
          type="button"
          className="text-xs text-[var(--accent)] underline"
          onClick={() => setPickerOpen((v) => !v)}
        >
          {request.consolidation ? "Change" : "Assign"}
        </button>
        {request.featureRequest ? (
          <Link href={`/requests/${request.featureRequest.id}`} className="text-xs text-[var(--accent)] underline">
            Feature request: {request.featureRequest.title}
          </Link>
        ) : null}
      </div>

      {pickerOpen ? (
        <ConsolidatePicker
          requestId={request.id}
          consolidations={consolidations}
          onDone={() => {
            setPickerOpen(false);
            router.refresh();
          }}
        />
      ) : null}

      {(request.productNotes || request.csNotes) ? (
        <div className="mt-3 grid gap-2 text-xs text-[var(--ink-muted)] md:grid-cols-2">
          {request.productNotes ? (
            <p>
              <span className="font-medium text-[var(--ink)]">Product notes:</span> {request.productNotes}
            </p>
          ) : null}
          {request.csNotes ? (
            <p>
              <span className="font-medium text-[var(--ink)]">CS notes:</span> {request.csNotes}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          className="rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-sm"
          value={status}
          disabled={busy}
          onChange={(e) => {
            const value = e.target.value as ClmRequestStatus;
            setStatus(value);
            saveMeta({ status: value });
          }}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-sm"
          value={priority}
          disabled={busy}
          onChange={(e) => {
            setPriority(e.target.value);
            saveMeta({ priority: e.target.value });
          }}
        >
          <option value="">No priority</option>
          {priorities.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function ProductRequestsTable({
  requests,
  consolidations,
}: Readonly<{
  requests: ProductRequest[];
  consolidations: Consolidation[];
}>) {
  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--ink-muted)]">
        No feature requests yet. Create one from Home.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <ProductRequestCard key={request.id} request={request} consolidations={consolidations} />
      ))}
    </div>
  );
}
