import { FeatureSignalStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const status = req.nextUrl.searchParams.get("status") as FeatureSignalStatus | null;

  const signals = await prisma.featureSignal.findMany({
    where: status ? { status } : undefined,
    include: {
      org: true,
      channel: true,
      featureRequest: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(signals);
}
