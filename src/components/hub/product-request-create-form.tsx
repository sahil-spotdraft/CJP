"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ClmPriority } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

type Org = { id: string; name: string };

const priorities = Object.values(ClmPriority);

export function ProductRequestCreateForm({
  orgs,
  csOwners = [],
  redirectTo,
}: Readonly<{ orgs: Org[]; csOwners?: string[]; redirectTo?: string }>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/product-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: form.get("orgId"),
        ask: form.get("ask"),
        csOwner: form.get("csOwner") || undefined,
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
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:grid-cols-2"
    >
      <div>
        <Label htmlFor="orgId">WS Name</Label>
        <select
          id="orgId"
          name="orgId"
          required
          className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
        >
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="csOwner">CS Owner</Label>
        <select
          id="csOwner"
          name="csOwner"
          className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
        >
          <option value="">None</option>
          {csOwners.map((owner) => (
            <option key={owner} value={owner}>
              {owner}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="ask">Request / Ask</Label>
        <Textarea id="ask" name="ask" rows={2} required placeholder="What is the customer asking for?" />
      </div>
      <div>
        <Label htmlFor="priority">Priority</Label>
        <select
          id="priority"
          name="priority"
          className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
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
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create feature request"}
        </Button>
      </div>
    </form>
  );
}
