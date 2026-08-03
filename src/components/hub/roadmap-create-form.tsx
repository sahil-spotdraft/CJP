"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

export function RoadmapCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    await fetch("/api/roadmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        theme: form.get("theme") || undefined,
        quarter: form.get("quarter") || undefined,
        description: form.get("description") || undefined,
      }),
    });
    (e.target as HTMLFormElement).reset();
    setLoading(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:grid-cols-2"
    >
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required placeholder="Reporting upgrades" />
      </div>
      <div>
        <Label htmlFor="quarter">Quarter</Label>
        <Input id="quarter" name="quarter" placeholder="2026-Q3" />
      </div>
      <div>
        <Label htmlFor="theme">Theme</Label>
        <Input id="theme" name="theme" placeholder="Platform" />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create roadmap item"}
        </Button>
      </div>
    </form>
  );
}
