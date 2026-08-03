import { ClassificationJobStatus, FeatureSignalStatus } from "@prisma/client";
import { classifyMessage } from "@/lib/ai/classifier";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getPermalink, postThreadReply } from "@/lib/slack/client";
import { getAppSettings } from "@/lib/services/settings";

export type IncomingSlackMessage = {
  channel: string;
  user?: string;
  text?: string;
  ts: string;
  thread_ts?: string;
  subtype?: string;
  bot_id?: string;
};

function shouldSkipMessage(message: IncomingSlackMessage): string | null {
  if (message.bot_id) return "bot_message";
  if (message.subtype && message.subtype !== "file_share") return `subtype:${message.subtype}`;
  const text = message.text?.trim() ?? "";
  if (text.length < 12) return "too_short";
  return null;
}

export async function handleSlackMessage(message: IncomingSlackMessage): Promise<{
  handled: boolean;
  reason?: string;
  signalId?: string;
}> {
  const skipReason = shouldSkipMessage(message);
  if (skipReason) {
    return { handled: false, reason: skipReason };
  }

  const channel = await prisma.slackChannel.findUnique({
    where: { channelId: message.channel },
    include: { org: true },
  });

  if (!channel || !channel.enabled) {
    return { handled: false, reason: "channel_not_mapped" };
  }

  const existing = await prisma.featureSignal.findUnique({
    where: {
      channelId_slackTs: {
        channelId: channel.id,
        slackTs: message.ts,
      },
    },
  });
  if (existing) {
    return { handled: false, reason: "duplicate", signalId: existing.id };
  }

  const text = message.text!.trim();
  const settings = await getAppSettings();
  const envThreshold = getEnv().CLASSIFIER_CONFIDENCE_THRESHOLD;
  const threshold = settings.confidenceThreshold || envThreshold;

  let classification;
  try {
    classification = await classifyMessage(text);
  } catch (error) {
    await prisma.classificationJob.create({
      data: {
        status: ClassificationJobStatus.FAILED,
        error: error instanceof Error ? error.message : "classification_failed",
        prompt: text,
      },
    });
    return { handled: false, reason: "classification_failed" };
  }

  const { result, model, raw } = classification;

  if (!result.is_feature_request || result.confidence < threshold) {
    await prisma.classificationJob.create({
      data: {
        status: ClassificationJobStatus.SKIPPED,
        model,
        prompt: text,
        responseJson: raw as object,
      },
    });
    return { handled: false, reason: "below_threshold" };
  }

  const permalink = await getPermalink(message.channel, message.ts);

  const signal = await prisma.featureSignal.create({
    data: {
      status: FeatureSignalStatus.PENDING,
      rawText: text,
      aiTitle: result.title,
      aiSummary: result.summary,
      aiConfidence: result.confidence,
      aiTags: result.tags,
      slackUserId: message.user,
      slackTs: message.ts,
      threadTs: message.thread_ts ?? message.ts,
      permalink,
      orgId: channel.orgId,
      channelId: channel.id,
      classification: {
        create: {
          status: ClassificationJobStatus.COMPLETED,
          model,
          prompt: text,
          responseJson: raw as object,
        },
      },
    },
  });

  if (settings.threadReplyEnabled) {
    const triageUrl = `${getEnv().APP_BASE_URL}/triage/${signal.id}`;
    const replyText = [
      "Feature request detected.",
      `Review & match or create: ${triageUrl}`,
    ].join("\n");

    try {
      const botReplyTs = await postThreadReply({
        channel: message.channel,
        threadTs: message.thread_ts ?? message.ts,
        text: replyText,
      });
      if (botReplyTs) {
        await prisma.featureSignal.update({
          where: { id: signal.id },
          data: { botReplyTs },
        });
      }
    } catch (error) {
      console.error("Failed to post Slack thread reply", error);
    }
  }

  return { handled: true, signalId: signal.id };
}
