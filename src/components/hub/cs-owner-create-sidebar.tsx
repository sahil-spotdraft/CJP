"use client";

import { FormEvent, useCallback, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SidePanel } from "@/components/ui/side-panel";

export function CsOwnerCreateSidebar() {
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
    const res = await fetch("/api/cs-owners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to create CS owner");
      return;
    }
    (e.target as HTMLFormElement).reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Add CS owner
      </Button>

      <SidePanel
        open={open}
        title="Add CS owner"
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
            <Label htmlFor="cs-owner-name">Name</Label>
            <Input id="cs-owner-name" name="name" required autoFocus={open} placeholder="Pooja" />
          </div>
          <div>
            <Label htmlFor="cs-owner-email">Email</Label>
            <Input
              id="cs-owner-email"
              name="email"
              type="email"
              required
              placeholder="pooja@company.com"
            />
          </div>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        </form>
      </SidePanel>
    </>
  );
}
