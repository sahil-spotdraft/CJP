import { asNumberArray } from "@/lib/ai/embeddings";
import { cosineSimilarity, jaccard, tokenize } from "@/lib/utils";

export type RankableRequest = {
  id: string;
  title: string;
  summary: string;
  embedding: unknown;
};

export type RankedRequest<T extends RankableRequest> = T & {
  score: number;
};

export function rankSimilarRequests<T extends RankableRequest>(
  query: { title: string; summary: string; embedding?: number[] | null },
  candidates: T[],
  limit = 8,
): RankedRequest<T>[] {
  const queryText = `${query.title} ${query.summary}`;
  const queryTokens = tokenize(queryText);

  const ranked = candidates.map((candidate) => {
    const candidateText = `${candidate.title} ${candidate.summary}`;
    const lexical = jaccard(queryTokens, tokenize(candidateText));

    let semantic = 0;
    const candidateEmbedding = asNumberArray(candidate.embedding);
    if (query.embedding && candidateEmbedding) {
      semantic = cosineSimilarity(query.embedding, candidateEmbedding);
    }

    const titleBoost =
      candidate.title.toLowerCase().includes(query.title.toLowerCase().slice(0, 24)) ||
      query.title.toLowerCase().includes(candidate.title.toLowerCase().slice(0, 24))
        ? 0.08
        : 0;

    const score = semantic > 0 ? semantic * 0.75 + lexical * 0.25 + titleBoost : lexical + titleBoost;

    return { ...candidate, score };
  });

  return ranked
    .filter((r) => r.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
