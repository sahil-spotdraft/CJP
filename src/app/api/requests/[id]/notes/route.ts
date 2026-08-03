import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";

const schema = z.object({
  body: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return jsonError(body.error.message);

  const note = await prisma.featureRequestNote.create({
    data: {
      featureRequestId: id,
      body: body.data.body.trim(),
      authorId: session!.user.id,
    },
    include: { author: true },
  });

  return NextResponse.json(note, { status: 201 });
}
