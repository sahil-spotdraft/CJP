import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const tags = await prisma.tag.findMany({
    include: { _count: { select: { requests: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(tags);
}

const schema = z.object({
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) return jsonError(body.error.message);

  const tag = await prisma.tag.upsert({
    where: { name: body.data.name.trim().toLowerCase() },
    create: { name: body.data.name.trim().toLowerCase() },
    update: {},
  });

  return NextResponse.json(tag, { status: 201 });
}
