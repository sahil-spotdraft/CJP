import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { TagCreateForm } from "@/components/hub/tag-create-form";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const tags = await prisma.tag.findMany({
    include: { _count: { select: { requests: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Tags</h1>
        <p className="mt-1 text-[var(--ink-muted)]">Organize feature requests by theme.</p>
      </div>
      <TagCreateForm />
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag.id} className="bg-[var(--surface)] px-3 py-1.5 text-sm">
            {tag.name} · {tag._count.requests}
          </Badge>
        ))}
        {tags.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No tags yet.</p>
        ) : null}
      </div>
    </div>
  );
}
