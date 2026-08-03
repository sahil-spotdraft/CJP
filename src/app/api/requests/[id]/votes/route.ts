import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const userId = session!.user.id;

  const existing = await prisma.vote.findUnique({
    where: {
      featureRequestId_userId: { featureRequestId: id, userId },
    },
  });

  if (existing) {
    await prisma.vote.delete({ where: { id: existing.id } });
    return NextResponse.json({ voted: false });
  }

  await prisma.vote.create({
    data: { featureRequestId: id, userId },
  });

  return NextResponse.json({ voted: true });
}
