-- Recreate ClmPriority with sheet labels (Critical / High / Low)
CREATE TYPE "ClmPriority_new" AS ENUM ('CRITICAL', 'HIGH', 'LOW');

ALTER TABLE "ProductRequest"
  ALTER COLUMN "priority" TYPE "ClmPriority_new"
  USING (
    CASE "priority"::text
      WHEN 'P0' THEN 'CRITICAL'::"ClmPriority_new"
      WHEN 'P1' THEN 'HIGH'::"ClmPriority_new"
      WHEN 'P2' THEN 'HIGH'::"ClmPriority_new"
      WHEN 'P3' THEN 'LOW'::"ClmPriority_new"
      WHEN 'CRITICAL' THEN 'CRITICAL'::"ClmPriority_new"
      WHEN 'HIGH' THEN 'HIGH'::"ClmPriority_new"
      WHEN 'LOW' THEN 'LOW'::"ClmPriority_new"
      ELSE NULL
    END
  );

DROP TYPE "ClmPriority";
ALTER TYPE "ClmPriority_new" RENAME TO "ClmPriority";

-- Recreate ClmRequestStatus to add IN_ROADMAP (matches sheet "In Roadmap")
CREATE TYPE "ClmRequestStatus_new" AS ENUM (
  'NEW',
  'DISCUSSED_WITH_PRODUCT',
  'IN_ROADMAP',
  'PLANNED',
  'IN_PROGRESS',
  'SHIPPED',
  'DECLINED'
);

ALTER TABLE "ProductRequest"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "ProductRequest"
  ALTER COLUMN "status" TYPE "ClmRequestStatus_new"
  USING (
    CASE "status"::text
      WHEN 'IN_ROADMAP' THEN 'IN_ROADMAP'::"ClmRequestStatus_new"
      ELSE "status"::text::"ClmRequestStatus_new"
    END
  );

ALTER TABLE "ProductRequest"
  ALTER COLUMN "status" SET DEFAULT 'NEW'::"ClmRequestStatus_new";

DROP TYPE "ClmRequestStatus";
ALTER TYPE "ClmRequestStatus_new" RENAME TO "ClmRequestStatus";
