import { listCsOwners } from "@/lib/services/cs-owner";
import { CsOwnerCreateSidebar } from "@/components/hub/cs-owner-create-sidebar";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function CsOwnersPage() {
  const owners = await listCsOwners();

  return (
    <div className="space-y-6">
      <PageHeader
        title="CS Owners"
        description="Manage CS owners assigned to feature requests. Email must be unique and valid."
        actions={<CsOwnerCreateSidebar />}
      />

      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left">
              <th className="px-4 py-3 text-label">Name</th>
              <th className="px-4 py-3 text-label">Email</th>
            </tr>
          </thead>
          <tbody>
            {owners.map((owner) => (
              <tr key={owner.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 font-medium">{owner.name}</td>
                <td className="px-4 py-3 text-[var(--ink-muted)]">{owner.email}</td>
              </tr>
            ))}
            {owners.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-5 py-10 text-center text-[var(--ink-muted)]">
                  No CS owners yet. Click Add CS owner to create one.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
