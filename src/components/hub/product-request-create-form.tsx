"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ClmPriority } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCsOwnerLabel } from "@/lib/cs-owner-label";

type Org = { id: string; name: string };
type Consolidation = { id: string; name: string; notes?: string | null };
type CsOwner = { id: string; name: string; email: string };

const priorities = Object.values(ClmPriority);

export function ProductRequestCreateForm({
  orgs,
  consolidations = [],
  csOwners = [],
  redirectTo,
}: Readonly<{
  orgs: Org[];
  consolidations?: Consolidation[];
  csOwners?: CsOwner[];
  redirectTo?: string;
}>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceIds, setWorkspaceIds] = useState<string[]>([]);

  function toggleWorkspace(orgId: string) {
    setWorkspaceIds((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId],
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (workspaceIds.length === 0) {
      setError("Select at least one workspace");
      return;
    }
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/product-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceIds,
        ask: form.get("ask"),
        consolidationId: form.get("consolidationId"),
        csOwnerId: form.get("csOwnerId"),
        priority: form.get("priority") || undefined,
        timeline: form.get("timeline") || undefined,
        productNotes: form.get("productNotes") || undefined,
        csNotes: form.get("csNotes") || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to create feature request");
      return;
    }
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      (e.target as HTMLFormElement).reset();
      setWorkspaceIds([]);
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 md:grid-cols-2"
    >
      <div className="md:col-span-2">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <Label>Workspaces (WS Name)</Label>
          <span className="text-xs text-[var(--ink-muted)]">
            {workspaceIds.length} selected · at least one required
          </span>
        </div>
        <div className="grid max-h-56 gap-2 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:grid-cols-2">
          {orgs.map((org) => {
            const checked = workspaceIds.includes(org.id);
            return (
              <label
                key={org.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                  checked
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]/50"
                    : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleWorkspace(org.id)}
                />
                <span className="font-medium">{org.name}</span>
              </label>
            );
          })}
          {orgs.length === 0 ? (
            <p className="col-span-full text-sm text-[var(--ink-muted)]">
              No workspaces yet — add one on the Orgs page first.
            </p>
          ) : null}
        </div>
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="csOwnerId">CS Owner</Label>
        <select
          id="csOwnerId"
          name="csOwnerId"
          required
          className="control"
        >
          <option value="">Select a CS owner…</option>
          {csOwners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {formatCsOwnerLabel(owner)}
            </option>
          ))}
        </select>
        {csOwners.length === 0 ? (
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            No CS owners yet — add one on the CS Owners page first.
          </p>
        ) : null}
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="ask">Request / Ask</Label>
        <Textarea id="ask" name="ask" rows={2} required placeholder="What is the customer asking for?" />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="consolidationId">Consolidation</Label>
        <select
          id="consolidationId"
          name="consolidationId"
          required
          className="control"
        >
          <option value="">Select a consolidation…</option>
          {consolidations.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.notes ? ` — ${c.notes.slice(0, 60)}${c.notes.length > 60 ? "…" : ""}` : ""}
            </option>
          ))}
        </select>
        {consolidations.length === 0 ? (
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            No consolidations yet — add one on the Consolidation page first.
          </p>
        ) : null}
      </div>
      <div>
        <Label htmlFor="priority">Priority</Label>
        <select
          id="priority"
          name="priority"
          className="control"
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
        <Label htmlFor="timeline">Timeline</Label>
        <Input id="timeline" name="timeline" placeholder="2026-Q4" />
      </div>
      <div>
        <Label htmlFor="productNotes">Product notes</Label>
        <Textarea id="productNotes" name="productNotes" rows={2} />
      </div>
      <div>
        <Label htmlFor="csNotes">CS notes</Label>
        <Textarea id="csNotes" name="csNotes" rows={2} />
      </div>
      {error ? (
        <p className="md:col-span-2 text-sm text-[var(--danger)]">{error}</p>
      ) : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={loading || workspaceIds.length === 0}>
          {loading ? "Creating…" : "Create feature request"}
        </Button>
      </div>
    </form>
  );
}
