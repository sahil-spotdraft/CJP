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
  dueDate: z
    .union([
      z.string().datetime(),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.null(),
    ])
    .optional(),
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
      title: body.data.title,
      summary: body.data.summary,
      status: body.data.status,
      roadmapId: body.data.roadmapId,
      ...(body.data.dueDate !== undefined
        ? {
            dueDate: body.data.dueDate
              ? new Date(
                  /^\d{4}-\d{2}-\d{2}$/.test(body.data.dueDate)
                    ? `${body.data.dueDate}T12:00:00.000Z`
                    : body.data.dueDate,
                )
              : null,
          }
        : {}),
      ...(embedding ? { embedding } : {}),
    },
    include: {
      tags: { include: { tag: true } },
      votes: true,
      notes: true,
      roadmap: true,
      signals: { include: { org: true, channel: true } },
      sources: true,
      activities: true,
    },
  });

  return NextResponse.json(request);
}
