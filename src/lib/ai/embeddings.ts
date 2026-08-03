import { getOpenAI } from "@/lib/ai/client";

export async function embedText(text: string): Promise<number[] | null> {
  const client = getOpenAI();
  if (!client) return null;

  const input = text.replace(/\s+/g, " ").trim().slice(0, 8000);
  if (!input) return null;

  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });

  return response.data[0]?.embedding ?? null;
}

export function asNumberArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((n) => typeof n === "number")) return null;
  return value as number[];
}
