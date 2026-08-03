import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  arr: z.number().nonnegative().nullable().optional(),
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

  const org = await prisma.customerOrg.update({
    where: { id },
    data: body.data,
  });

  return NextResponse.json(org);
}
