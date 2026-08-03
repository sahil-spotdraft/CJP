"use client";

import { FormEvent, useCallback, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SidePanel } from "@/components/ui/side-panel";

export function OrgCreateSidebar() {
  const router = useRouter();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    if (loading) return;
    setOpen(false);
    setError(null);
  }, [loading]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const arr = form.get("arr");
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        slug: form.get("slug") || undefined,
        arr: arr ? Number(arr) : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to create org");
      return;
    }
    (e.target as HTMLFormElement).reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Add org
      </Button>

      <SidePanel
        open={open}
        title="Add org"
        onClose={close}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={close} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={loading}>
              {loading ? "Creating…" : "Create"}
            </Button>
          </div>
        }
      >
        <form id={formId} onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="org-name">Org name</Label>
            <Input id="org-name" name="name" required autoFocus={open} placeholder="Acme Corp" />
          </div>
          <div>
            <Label htmlFor="org-slug">Slug (optional)</Label>
            <Input id="org-slug" name="slug" placeholder="acme" />
          </div>
          <div>
            <Label htmlFor="org-arr">Account ARR (optional)</Label>
            <Input id="org-arr" name="arr" type="number" min={0} step="1" placeholder="250000" />
          </div>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        </form>
      </SidePanel>
    </>
  );
}
