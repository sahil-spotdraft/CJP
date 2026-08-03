import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const orgs = await prisma.customerOrg.findMany({
    include: {
      _count: { select: { channels: true, signals: true } },
      channels: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(orgs);
}

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  arr: z.number().nonnegative().optional(),
});

export async function POST(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return jsonError(body.error.message);

  const slug = body.data.slug?.trim() || slugify(body.data.name);
  const org = await prisma.customerOrg.create({
    data: { name: body.data.name.trim(), slug, arr: body.data.arr },
  });

  return NextResponse.json(org, { status: 201 });
}
