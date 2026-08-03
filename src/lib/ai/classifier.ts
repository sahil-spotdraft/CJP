import { z } from "zod";
import { getEnv } from "@/lib/env";
import { getOpenAI } from "@/lib/ai/client";

export const classificationSchema = z.object({
  is_feature_request: z.boolean(),
  confidence: z.number().min(0).max(1),
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string()).default([]),
  rationale: z.string().default(""),
});

export type ClassificationResult = z.infer<typeof classificationSchema>;

const SYSTEM_PROMPT = `You classify Slack messages from customer/support channels.
Return ONLY valid JSON with this shape:
{
  "is_feature_request": boolean,
  "confidence": number,
  "title": string,
  "summary": string,
  "tags": string[],
  "rationale": string
}

Mark is_feature_request=true only for genuine product feature asks or capability gaps.
Do NOT flag: bugs, how-to questions, chitchat, status updates, or pure praise/complaints without a ask.
Title should be short (<= 80 chars). Summary 1-2 sentences.`;

function heuristicClassify(text: string): ClassificationResult {
  const lower = text.toLowerCase();
  const patterns = [
    /would be (nice|great|helpful)/,
    /feature request/,
    /can we (have|get|add)/,
    /please add/,
    /wishlist/,
    /it would help if/,
    /any plans (to|for)/,
    /support for /,
    /need(s)? (a |an |the )?(way|ability|option|feature)/,
  ];
  const hit = patterns.some((p) => p.test(lower));
  const title = text.replace(/\s+/g, " ").trim().slice(0, 80) || "Untitled request";
  return {
    is_feature_request: hit,
    confidence: hit ? 0.62 : 0.15,
    title,
    summary: text.replace(/\s+/g, " ").trim().slice(0, 280),
    tags: hit ? ["unclassified"] : [],
    rationale: hit
      ? "Matched heuristic feature-request language (no OpenAI key configured)."
      : "No feature-request language detected by heuristic.",
  };
}

export async function classifyMessage(text: string): Promise<{
  result: ClassificationResult;
  model: string;
  raw: unknown;
}> {
  const env = getEnv();
  const client = getOpenAI();

  if (!client) {
    const result = heuristicClassify(text);
    return { result, model: "heuristic", raw: result };
  }

  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }

  const result = classificationSchema.parse(parsed);
  return { result, model: env.OPENAI_MODEL, raw: parsed };
}
