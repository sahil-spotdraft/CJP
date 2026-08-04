import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspaceRetentionDetail } from "@/lib/services/retention";
import { WorkspaceRetentionDetail } from "@/components/hub/workspace-retention-detail";

export const dynamic = "force-dynamic";

export default async function RetentionWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getWorkspaceRetentionDetail(id);
  if (!data) notFound();

  return (
    <div className="space-y-4">
      <Link href="/retention" className="text-sm text-[var(--accent)] hover:underline">
        ← Back to Retention
      </Link>
      <WorkspaceRetentionDetail data={data} />
    </div>
  );
}
