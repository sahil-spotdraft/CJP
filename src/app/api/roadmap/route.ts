import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const items = await prisma.roadmapItem.findMany({
    include: {
      requests: {
        include: {
          _count: { select: { votes: true, signals: true } },
          tags: { include: { tag: true } },
        },
      },
    },
    orderBy: [{ quarter: "asc" }, { title: "asc" }],
  });

  return NextResponse.json(items);
}

const schema = z.object({
  title: z.string().min(1),
  theme: z.string().optional(),
  quarter: z.string().optional(),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) return jsonError(body.error.message);

  const item = await prisma.roadmapItem.create({
    data: {
      title: body.data.title.trim(),
      theme: body.data.theme?.trim() || null,
      quarter: body.data.quarter?.trim() || null,
      description: body.data.description?.trim() || null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
