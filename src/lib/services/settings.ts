import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";

export async function getAppSettings() {
  const existing = await prisma.appSetting.findUnique({ where: { id: "default" } });
  if (existing) return existing;

  return prisma.appSetting.create({
    data: {
      id: "default",
      confidenceThreshold: getEnv().CLASSIFIER_CONFIDENCE_THRESHOLD,
      threadReplyEnabled: true,
    },
  });
}
