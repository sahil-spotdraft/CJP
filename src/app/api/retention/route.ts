import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { getRetentionDashboard } from "@/lib/services/retention";

export async function GET(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const csOwner = req.nextUrl.searchParams.get("csOwner") || undefined;
  const darkDays = Number(req.nextUrl.searchParams.get("darkDays") || 30);

  const data = await getRetentionDashboard({
    csOwner,
    darkThresholdDays: Number.isFinite(darkDays) ? darkDays : 30,
  });

  return NextResponse.json(data);
}
