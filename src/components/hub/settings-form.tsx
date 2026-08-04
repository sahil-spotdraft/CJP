"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Props = {
  settings: {
    confidenceThreshold: number;
    threadReplyEnabled: boolean;
  };
  channels: {
    id: string;
    name: string;
    channelId: string;
    enabled: boolean;
    orgName: string;
  }[];
  orgs: { id: string; name: string }[];
};

export function SettingsForm({ settings, channels, orgs }: Props) {
  const router = useRouter();
  const [threshold, setThreshold] = useState(String(settings.confidenceThreshold));
  const [threadReplyEnabled, setThreadReplyEnabled] = useState(settings.threadReplyEnabled);
  const [busy, setBusy] = useState(false);

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confidenceThreshold: Number(threshold),
        threadReplyEnabled,
      }),
    });
    setBusy(false);
    router.refresh();
  }

  async function addChannel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        channelId: form.get("channelId"),
        orgId: form.get("orgId"),
      }),
    });
    (e.target as HTMLFormElement).reset();
    setBusy(false);
    router.refresh();
  }

  async function toggleChannel(id: string, enabled: boolean) {
    setBusy(true);
    await fetch(`/api/channels/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={saveSettings}
        className="space-y-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <h2 className="text-xl font-semibold">Classifier</h2>
        <div>
          <Label htmlFor="threshold">Confidence threshold (0–1)</Label>
          <Input
            id="threshold"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            type="number"
            min={0}
            max={1}
            step={0.05}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={threadReplyEnabled}
            onChange={(e) => setThreadReplyEnabled(e.target.checked)}
          />
          Post triage link in the Slack thread when a feature request is detected
        </label>
        <Button type="submit" disabled={busy}>
          Save settings
        </Button>
      </form>

      <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-xl font-semibold">Watched channels</h2>
        <div className="mt-4 space-y-2">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm"
            >
              <div>
                <span className="font-medium">#{channel.name}</span>
                <span className="ml-2 text-[var(--ink-muted)]">{channel.channelId}</span>
                <Badge className="ml-2">{channel.orgName}</Badge>
              </div>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => toggleChannel(channel.id, channel.enabled)}
              >
                {channel.enabled ? "Pause" : "Enable"}
              </Button>
            </div>
          ))}
          {channels.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">No channels mapped yet.</p>
          ) : null}
        </div>

        <form onSubmit={addChannel} className="mt-5 grid gap-3 md:grid-cols-4 md:items-end">
          <div>
            <Label htmlFor="orgId">Org</Label>
            <select
              id="orgId"
              name="orgId"
              required
              className="control"
            >
              <option value="">Select org</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="name">Channel name</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="channelId">Slack channel ID</Label>
            <Input id="channelId" name="channelId" required placeholder="C0..." />
          </div>
          <Button type="submit" disabled={busy || orgs.length === 0}>
            Add channel
          </Button>
        </form>
      </section>
    </div>
  );
}
