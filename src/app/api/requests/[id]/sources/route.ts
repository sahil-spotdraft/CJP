import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  type: z.enum(["SLACK", "JIRA"]),
  label: z.string().min(1),
  url: z.string().url(),
  externalId: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const sources = await prisma.featureRequestSource.findMany({
    where: { featureRequestId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sources);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = createSchema.safeParse(await req.json());
  if (!body.success) return jsonError(body.error.message);

  const request = await prisma.featureRequest.findUnique({ where: { id } });
  if (!request) return jsonError("Not found", 404);

  const source = await prisma.featureRequestSource.create({
    data: {
      featureRequestId: id,
      type: body.data.type,
      label: body.data.label.trim(),
      url: body.data.url.trim(),
      externalId: body.data.externalId?.trim() || null,
    },
  });

  return NextResponse.json(source, { status: 201 });
}
