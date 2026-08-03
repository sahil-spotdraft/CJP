import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  orgId: z.string().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return jsonError(body.error.message);

  const channel = await prisma.slackChannel.update({
    where: { id },
    data: body.data,
    include: { org: true },
  });

  return NextResponse.json(channel);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  await prisma.slackChannel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
