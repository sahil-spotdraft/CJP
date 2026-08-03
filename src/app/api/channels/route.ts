import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const channels = await prisma.slackChannel.findMany({
    include: { org: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(channels);
}

const createSchema = z.object({
  channelId: z.string().min(1),
  name: z.string().min(1),
  orgId: z.string().min(1),
  enabled: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return jsonError(body.error.message);

  const channel = await prisma.slackChannel.create({
    data: {
      channelId: body.data.channelId.trim(),
      name: body.data.name.trim(),
      orgId: body.data.orgId,
      enabled: body.data.enabled ?? true,
    },
    include: { org: true },
  });

  return NextResponse.json(channel, { status: 201 });
}
