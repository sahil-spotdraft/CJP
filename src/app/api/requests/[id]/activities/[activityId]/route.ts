import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; activityId: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id, activityId } = await params;
  const activity = await prisma.featureRequestActivity.findFirst({
    where: { id: activityId, featureRequestId: id },
  });
  if (!activity) return jsonError("Not found", 404);

  await prisma.featureRequestActivity.delete({ where: { id: activityId } });
  return NextResponse.json({ ok: true });
}
