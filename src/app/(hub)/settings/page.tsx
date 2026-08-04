import { prisma } from "@/lib/db";
import { getAppSettings } from "@/lib/services/settings";
import { SettingsForm } from "@/components/hub/settings-form";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, channels, orgs] = await Promise.all([
    getAppSettings(),
    prisma.slackChannel.findMany({ include: { org: true }, orderBy: { name: "asc" } }),
    prisma.customerOrg.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Classifier threshold, Slack thread replies, and watched channels."
      />

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
