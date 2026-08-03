import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { getAnalytics, type AnalyticsLens } from "@/lib/services/analytics";

export async function GET(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const lensParam = req.nextUrl.searchParams.get("lens") ?? "global";
  const csOwner = req.nextUrl.searchParams.get("csOwner") ?? undefined;
  if (!["global", "csm", "pm"].includes(lensParam)) {
    return jsonError("Invalid lens");
  }

  const data = await getAnalytics(lensParam as AnalyticsLens, csOwner || undefined);
  return NextResponse.json(data);
}
