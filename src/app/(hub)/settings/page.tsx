import { prisma } from "@/lib/db";
import { getAppSettings } from "@/lib/services/settings";
import { SettingsForm } from "@/components/hub/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, channels, orgs] = await Promise.all([
    getAppSettings(),
    prisma.slackChannel.findMany({ include: { org: true }, orderBy: { name: "asc" } }),
    prisma.customerOrg.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Settings</h1>
        <p className="mt-1 text-[var(--ink-muted)]">
          Classifier threshold, Slack thread replies, and watched channels.
        </p>
      </div>

      <SettingsForm
        settings={{
          confidenceThreshold: settings.confidenceThreshold,
          threadReplyEnabled: settings.threadReplyEnabled,
        }}
        channels={channels.map((c) => ({
          id: c.id,
          name: c.name,
          channelId: c.channelId,
          enabled: c.enabled,
          orgName: c.org.name,
        }))}
        orgs={orgs.map((o) => ({ id: o.id, name: o.name }))}
      />
    </div>
  );
}
