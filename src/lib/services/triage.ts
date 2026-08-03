import { FeatureRequestStatus, FeatureSignalStatus, Prisma } from "@prisma/client";
import { embedText } from "@/lib/ai/embeddings";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { rankSimilarRequests } from "@/lib/similarity/rank";
import { updateMessage } from "@/lib/slack/client";

const signalInclude = {
  org: true,
  channel: true,
  featureRequest: true,
} satisfies Prisma.FeatureSignalInclude;

export async function getSignalForTriage(signalId: string) {
  return prisma.featureSignal.findUnique({
    where: { id: signalId },
    include: signalInclude,
  });
}

export async function findSimilarFeatureRequests(signalId: string) {
  const signal = await prisma.featureSignal.findUniqueOrThrow({
    where: { id: signalId },
  });

  const queryTitle = signal.aiTitle ?? signal.rawText.slice(0, 80);
  const querySummary = signal.aiSummary ?? signal.rawText;
  const queryEmbedding = await embedText(`${queryTitle}\n${querySummary}`);

  const candidates = await prisma.featureRequest.findMany({
    where: {
      status: { notIn: [FeatureRequestStatus.DECLINED, FeatureRequestStatus.SHIPPED] },
    },
    include: {
      votes: true,
      notes: { orderBy: { createdAt: "desc" }, take: 1 },
      signals: {
        where: { status: FeatureSignalStatus.MATCHED },
        include: { org: true },
      },
      tags: { include: { tag: true } },
    },
    take: 100,
    orderBy: { updatedAt: "desc" },
  });

  const ranked = rankSimilarRequests(
    { title: queryTitle, summary: querySummary, embedding: queryEmbedding },
    candidates.map((c) => ({
      id: c.id,
      title: c.title,
      summary: c.summary,
      embedding: c.embedding,
      status: c.status,
      voteCount: c.votes.length,
      orgs: [...new Map(c.signals.map((s) => [s.org.id, s.org])).values()],
      latestNote: c.notes[0]?.body ?? null,
      tags: c.tags.map((t) => t.tag.name),
    })),
  );

  return ranked;
}

async function maybeUpdateSlackThread(
  signal: {
    botReplyTs: string | null;
    channel: { channelId: string };
  },
  text: string,
) {
  if (!signal.botReplyTs) return;
  try {
    await updateMessage({
      channel: signal.channel.channelId,
      ts: signal.botReplyTs,
      text,
    });
  } catch (error) {
    console.error("Failed to update Slack thread reply", error);
  }
}

export async function matchSignalToRequest(params: {
  signalId: string;
  featureRequestId: string;
  note?: string;
  authorId?: string;
}) {
  const signal = await prisma.featureSignal.findUniqueOrThrow({
    where: { id: params.signalId },
    include: { channel: true, org: true, featureRequest: true },
  });

  if (signal.status !== FeatureSignalStatus.PENDING) {
    throw new Error("Signal is no longer pending");
  }

  const request = await prisma.featureRequest.findUniqueOrThrow({
    where: { id: params.featureRequestId },
  });

  const updated = await prisma.$transaction(async (tx) => {
    const matched = await tx.featureSignal.update({
      where: { id: signal.id },
      data: {
        status: FeatureSignalStatus.MATCHED,
        featureRequestId: request.id,
        triageNote: params.note?.trim() || null,
      },
      include: signalInclude,
    });

    if (params.note?.trim()) {
      await tx.featureRequestNote.create({
        data: {
          featureRequestId: request.id,
          body: `[${signal.org.name}] ${params.note.trim()}`,
          authorId: params.authorId,
        },
      });
    }

    await tx.featureRequest.update({
      where: { id: request.id },
      data: { updatedAt: new Date() },
    });

    return matched;
  });

  await maybeUpdateSlackThread(
    signal,
    `Feature request matched to: *${request.title}*\n${getEnv().APP_BASE_URL}/requests/${request.id}`,
  );

  return updated;
}

export async function createRequestFromSignal(params: {
  signalId: string;
  title: string;
  summary: string;
  note?: string;
  tags?: string[];
  authorId?: string;
}) {
  const signal = await prisma.featureSignal.findUniqueOrThrow({
    where: { id: params.signalId },
    include: { channel: true, org: true },
  });

  if (signal.status !== FeatureSignalStatus.PENDING) {
    throw new Error("Signal is no longer pending");
  }

  const embedding = await embedText(`${params.title}\n${params.summary}`);

  const created = await prisma.$transaction(async (tx) => {
    const request = await tx.featureRequest.create({
      data: {
        title: params.title.trim(),
        summary: params.summary.trim(),
        status: FeatureRequestStatus.NEW,
        embedding: embedding ?? undefined,
      },
    });

    if (params.tags?.length) {
      for (const name of params.tags) {
        const tag = await tx.tag.upsert({
          where: { name: name.trim().toLowerCase() },
          create: { name: name.trim().toLowerCase() },
          update: {},
        });
        await tx.featureRequestTag.create({
          data: { featureRequestId: request.id, tagId: tag.id },
        });
      }
    }

    if (params.note?.trim()) {
      await tx.featureRequestNote.create({
        data: {
          featureRequestId: request.id,
          body: `[${signal.org.name}] ${params.note.trim()}`,
          authorId: params.authorId,
        },
      });
    }

    const matched = await tx.featureSignal.update({
      where: { id: signal.id },
      data: {
        status: FeatureSignalStatus.MATCHED,
        featureRequestId: request.id,
        triageNote: params.note?.trim() || null,
      },
      include: {
        ...signalInclude,
        featureRequest: {
          include: {
            tags: { include: { tag: true } },
            notes: true,
            votes: true,
            signals: { include: { org: true, channel: true } },
          },
        },
      },
    });

    return matched;
  });

  await maybeUpdateSlackThread(
    signal,
    `Feature request created: *${params.title.trim()}*\n${getEnv().APP_BASE_URL}/requests/${created.featureRequestId}`,
  );

  return created;
}

export async function dismissSignal(params: {
  signalId: string;
  note?: string;
}) {
  const signal = await prisma.featureSignal.findUniqueOrThrow({
    where: { id: params.signalId },
    include: { channel: true },
  });

  if (signal.status !== FeatureSignalStatus.PENDING) {
    throw new Error("Signal is no longer pending");
  }

  const updated = await prisma.featureSignal.update({
    where: { id: signal.id },
    data: {
      status: FeatureSignalStatus.DISMISSED,
      triageNote: params.note?.trim() || null,
    },
    include: signalInclude,
  });

  await maybeUpdateSlackThread(
    signal,
    "Marked as not a feature request in Feature Hub.",
  );

  return updated;
}
