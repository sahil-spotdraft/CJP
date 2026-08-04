import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sourceId: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id, sourceId } = await params;
  const source = await prisma.featureRequestSource.findFirst({
    where: { id: sourceId, featureRequestId: id },
  });
  if (!source) return jsonError("Not found", 404);

  await prisma.featureRequestSource.delete({ where: { id: sourceId } });
  return NextResponse.json({ ok: true });
}
