import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { embedText } from "@/lib/ai/embeddings";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const request = await prisma.featureRequest.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      votes: { include: { user: true } },
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      roadmap: true,
      signals: {
        include: { org: true, channel: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!request) return jsonError("Not found", 404);
  return NextResponse.json(request);
}

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  status: z
    .enum(["NEW", "TRIAGED", "PLANNED", "IN_PROGRESS", "SHIPPED", "DECLINED"])
    .optional(),
  roadmapId: z.string().nullable().optional(),
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

  let embedding: number[] | null | undefined;
  if (body.data.title || body.data.summary) {
    const current = await prisma.featureRequest.findUnique({ where: { id } });
    if (!current) return jsonError("Not found", 404);
    embedding = await embedText(
      `${body.data.title ?? current.title}\n${body.data.summary ?? current.summary}`,
    );
  }

  const request = await prisma.featureRequest.update({
    where: { id },
    data: {
      ...body.data,
      ...(embedding ? { embedding } : {}),
    },
    include: {
      tags: { include: { tag: true } },
      votes: true,
      notes: true,
      roadmap: true,
      signals: { include: { org: true, channel: true } },
    },
  });

  return NextResponse.json(request);
}
