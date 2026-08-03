import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import {
  createConsolidation,
  listConsolidationsWithArr,
} from "@/lib/services/consolidation";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const data = await listConsolidationsWithArr();
  return NextResponse.json(data);
}

const createSchema = z.object({
  name: z.string().min(1),
  feature: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return jsonError(body.error.message);

  try {
    const consolidation = await createConsolidation(body.data);
    return NextResponse.json(consolidation, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create failed";
    const status = message.includes("Unique constraint") ? 409 : 400;
    return jsonError(
      status === 409 ? "A consolidation with this name already exists" : message,
      status,
    );
  }
}
