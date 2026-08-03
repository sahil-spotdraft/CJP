import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import {
  getProductRequest,
  serializeProductRequest,
  updateProductRequest,
} from "@/lib/services/consolidation";

const priorityEnum = z.enum(["CRITICAL", "HIGH", "LOW"]);
const statusEnum = z.enum([
  "NEW",
  "DISCUSSED_WITH_PRODUCT",
  "IN_ROADMAP",
  "PLANNED",
  "IN_PROGRESS",
  "SHIPPED",
  "DECLINED",
]);

const patchSchema = z.object({
  ask: z.string().min(1).optional(),
  orgId: z.string().min(1).optional(),
  consolidationId: z.string().nullable().optional(),
  csOwner: z.string().nullable().optional(),
  priority: priorityEnum.nullable().optional(),
  status: statusEnum.optional(),
  productNotes: z.string().nullable().optional(),
  timeline: z.string().nullable().optional(),
  csNotes: z.string().nullable().optional(),
  featureRequestId: z.string().nullable().optional(),
  workspaceIds: z.array(z.string().min(1)).min(1).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const request = await getProductRequest(id);
  if (!request) return jsonError("Not found", 404);

  return NextResponse.json(serializeProductRequest(request));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return jsonError(body.error.message);

  try {
    const request = await updateProductRequest(id, body.data);
    return NextResponse.json(serializeProductRequest(request));
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Update failed", 400);
  }
}
