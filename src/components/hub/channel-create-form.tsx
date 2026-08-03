"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ChannelCreateForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        name: form.get("name"),
        channelId: form.get("channelId"),
      }),
    });
    (e.target as HTMLFormElement).reset();
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <div>
        <Label htmlFor="name">Channel name</Label>
        <Input id="name" name="name" required placeholder="support" />
      </div>
      <div>
        <Label htmlFor="channelId">Slack channel ID</Label>
        <Input id="channelId" name="channelId" required placeholder="C01234567" />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Adding…" : "Add channel"}
      </Button>
    </form>
  );
}
