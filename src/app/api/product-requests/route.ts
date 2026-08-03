import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSession } from "@/lib/api";
import {
  createProductRequest,
  listProductRequests,
  serializeProductRequest,
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

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const requests = await listProductRequests();
  return NextResponse.json(requests.map(serializeProductRequest));
}

const createSchema = z.object({
  workspaceIds: z.array(z.string().min(1)).min(1, "At least one workspace is required"),
  ask: z.string().min(1),
  consolidationId: z.string().min(1, "Consolidation is required"),
  csOwnerId: z.string().min(1, "CS Owner is required"),
  priority: priorityEnum.optional(),
  status: statusEnum.optional(),
  productNotes: z.string().optional(),
  timeline: z.string().optional(),
  csNotes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return jsonError(body.error.message);

  try {
    const request = await createProductRequest(body.data);
    return NextResponse.json(serializeProductRequest(request), { status: 201 });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Create failed", 400);
  }
}
