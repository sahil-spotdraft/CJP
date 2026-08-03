import { FeatureRequestStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const status = req.nextUrl.searchParams.get("status") as FeatureRequestStatus | null;
  const orgId = req.nextUrl.searchParams.get("orgId");

  const requests = await prisma.featureRequest.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(orgId
        ? { signals: { some: { orgId } } }
        : {}),
    },
    include: {
      tags: { include: { tag: true } },
      votes: true,
      roadmap: true,
      signals: {
        include: { org: true, channel: true },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { notes: true, votes: true, signals: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(requests);
}
