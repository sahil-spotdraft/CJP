import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  kind: z.enum(["NOTE", "SLACK", "JIRA", "STATUS", "SYSTEM"]).default("NOTE"),
  title: z.string().min(1),
  body: z.string().optional(),
  occurredAt: z.string().min(1).optional(),
  sourceId: z.string().optional().nullable(),
});

function parseOccurredAt(value?: string) {
  if (!value) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid occurredAt");
  }
  return parsed;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const activities = await prisma.featureRequestActivity.findMany({
    where: { featureRequestId: id },
    include: {
      author: { select: { id: true, name: true, email: true } },
      source: true,
    },
    orderBy: { occurredAt: "desc" },
  });
  return NextResponse.json(activities);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    const issue = body.error.issues[0]?.message ?? "Invalid request";
    return jsonError(issue);
  }

  const request = await prisma.featureRequest.findUnique({ where: { id } });
  if (!request) return jsonError("Not found", 404);

  if (body.data.sourceId) {
    const source = await prisma.featureRequestSource.findFirst({
      where: { id: body.data.sourceId, featureRequestId: id },
    });
    if (!source) return jsonError("Source not found on this request", 400);
  }

  let occurredAt: Date;
  try {
    occurredAt = parseOccurredAt(body.data.occurredAt);
  } catch {
    return jsonError("Invalid occurredAt");
  }

  const activity = await prisma.featureRequestActivity.create({
    data: {
      featureRequestId: id,
      kind: body.data.kind,
      title: body.data.title.trim(),
      body: body.data.body?.trim() || null,
      occurredAt,
      sourceId: body.data.sourceId || null,
      authorId: session!.user.id,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      source: true,
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
