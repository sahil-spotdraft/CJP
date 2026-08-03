"use client";

import { FormEvent, useCallback, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SidePanel } from "@/components/ui/side-panel";

export function ConsolidationCreateSidebar() {
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
    const res = await fetch("/api/consolidation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        feature: form.get("feature") || undefined,
        notes: form.get("notes") || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to create consolidation");
      return;
    }
    (e.target as HTMLFormElement).reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Add consolidation
      </Button>

      <SidePanel
        open={open}
        title="Add consolidation"
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
            <Label htmlFor="consolidation-name">Name</Label>
            <Input
              id="consolidation-name"
              name="name"
              required
              autoFocus={open}
              placeholder="e.g. Additional Fields - Signature blocks"
            />
          </div>
          <div>
            <Label htmlFor="consolidation-feature">Feature label (optional)</Label>
            <Input id="consolidation-feature" name="feature" placeholder="e.g. Signature" />
          </div>
          <div>
            <Label htmlFor="consolidation-notes">Notes (optional)</Label>
            <Textarea
              id="consolidation-notes"
              name="notes"
              rows={4}
              placeholder="Context that helps when linking from feature requests"
            />
          </div>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        </form>
      </SidePanel>
    </>
  );
}
