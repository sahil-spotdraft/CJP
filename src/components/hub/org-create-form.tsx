"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function OrgCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const arr = form.get("arr");
    await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        slug: form.get("slug") || undefined,
        arr: arr ? Number(arr) : undefined,
      }),
    });
    (e.target as HTMLFormElement).reset();
    setLoading(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
    >
      <div>
        <Label htmlFor="name">Org name</Label>
        <Input id="name" name="name" required placeholder="Acme Corp" />
      </div>
      <div>
        <Label htmlFor="slug">Slug (optional)</Label>
        <Input id="slug" name="slug" placeholder="acme" />
      </div>
      <div>
        <Label htmlFor="arr">Account ARR (optional)</Label>
        <Input id="arr" name="arr" type="number" min={0} step="1" placeholder="250000" />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Adding…" : "Add org"}
      </Button>
    </form>
  );
}
