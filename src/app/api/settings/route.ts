import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getAppSettings } from "@/lib/services/settings";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const settings = await getAppSettings();
  return NextResponse.json(settings);
}

const schema = z.object({
  confidenceThreshold: z.number().min(0).max(1).optional(),
  threadReplyEnabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) return jsonError(body.error.message);

  await getAppSettings();
  const settings = await prisma.appSetting.update({
    where: { id: "default" },
    data: body.data,
  });

  return NextResponse.json(settings);
}
