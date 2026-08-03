import { listCsOwners } from "@/lib/services/cs-owner";
import { CsOwnerCreateSidebar } from "@/components/hub/cs-owner-create-sidebar";

export const dynamic = "force-dynamic";

export default async function CsOwnersPage() {
  const owners = await listCsOwners();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">CS Owners</h1>
          <p className="mt-1 text-[var(--ink-muted)]">
            Manage CS owners assigned to feature requests. Email must be unique and valid.
          </p>
        </div>
        <CsOwnerCreateSidebar />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left">
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Email</th>
            </tr>
          </thead>
          <tbody>
            {owners.map((owner) => (
              <tr key={owner.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-5 py-3 font-medium">{owner.name}</td>
                <td className="px-5 py-3 text-[var(--ink-muted)]">{owner.email}</td>
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
