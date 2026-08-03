import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import { createCsOwner, listCsOwners } from "@/lib/services/cs-owner";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const owners = await listCsOwners();
  return NextResponse.json(owners);
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email("Email must be a valid email address"),
});

export async function POST(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return jsonError(body.error.message);

  try {
    const owner = await createCsOwner(body.data);
    return NextResponse.json(owner, { status: 201 });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Create failed", 400);
  }
}
