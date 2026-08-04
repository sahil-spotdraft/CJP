"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function TagCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name") }),
    });
    (e.target as HTMLFormElement).reset();
    setLoading(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-end gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <div className="min-w-[220px] flex-1">
        <Label htmlFor="name">Tag name</Label>
        <Input id="name" name="name" required placeholder="integrations" />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Adding…" : "Add tag"}
      </Button>
    </form>
  );
}
