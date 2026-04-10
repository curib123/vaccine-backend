DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VaccineCode') THEN
    CREATE TYPE "VaccineCode" AS ENUM (
      'BCG',
      'HEPATITIS_B',
      'PENTAVALENT',
      'OPV',
      'IPV',
      'PCV',
      'MMR'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    CREATE TYPE "NotificationType" AS ENUM (
      'SCHEDULE_CREATED',
      'UPCOMING_SCHEDULE',
      'STATUS_UPDATED',
      'LOW_STOCK',
      'STOCK_UPDATED',
      'CHILD_REGISTERED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmailDeliveryStatus') THEN
    CREATE TYPE "EmailDeliveryStatus" AS ENUM (
      'PENDING',
      'SENT',
      'FAILED'
    );
  END IF;
END
$$;

ALTER TABLE "Child"
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "motherName" TEXT,
  ADD COLUMN IF NOT EXISTS "fatherName" TEXT,
  ADD COLUMN IF NOT EXISTS "birthHeightCm" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "birthWeightKg" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "healthCenter" TEXT,
  ADD COLUMN IF NOT EXISTS "barangay" TEXT,
  ADD COLUMN IF NOT EXISTS "familyNumber" TEXT;

ALTER TABLE "Vaccine"
  ADD COLUMN IF NOT EXISTS "code" "VaccineCode",
  ADD COLUMN IF NOT EXISTS "stockQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reorderLevel" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "unit" TEXT NOT NULL DEFAULT 'dose',
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Vaccine"
SET "code" = CASE
  WHEN LOWER("name") = 'bcg' OR LOWER("name") = 'bcg vaccine' THEN 'BCG'::"VaccineCode"
  WHEN LOWER("name") = 'hepatitis b' OR LOWER("name") = 'hepatitis b vaccine' THEN 'HEPATITIS_B'::"VaccineCode"
  WHEN LOWER("name") = 'pentavalent' OR LOWER("name") = 'pentavalent vaccine (dpt-hep b-hib)' THEN 'PENTAVALENT'::"VaccineCode"
  WHEN LOWER("name") = 'opv' OR LOWER("name") = 'oral polio vaccine (opv)' THEN 'OPV'::"VaccineCode"
  WHEN LOWER("name") = 'ipv' OR LOWER("name") = 'inactivated polio vaccine (ipv)' THEN 'IPV'::"VaccineCode"
  WHEN LOWER("name") = 'pcv' OR LOWER("name") = 'pneumococcal conjugate vaccine (pcv)' THEN 'PCV'::"VaccineCode"
  WHEN LOWER("name") = 'mmr' OR LOWER("name") = 'measles, mumps, rubella vaccine (mmr)' THEN 'MMR'::"VaccineCode"
  ELSE "code"
END
WHERE "code" IS NULL;

ALTER TABLE "Vaccine"
  ALTER COLUMN "code" SET NOT NULL;

ALTER TABLE "ImmunizationSchedule"
  ADD COLUMN IF NOT EXISTS "recommendedAgeLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "dueDaysFromBirth" INTEGER;

UPDATE "ImmunizationSchedule" s
SET
  "recommendedAgeLabel" = CASE
    WHEN LOWER(v."name") = 'bcg' THEN 'At birth'
    WHEN LOWER(v."name") = 'hepatitis b vaccine' THEN 'At birth'
    WHEN LOWER(v."name") IN ('pentavalent', 'pentavalent vaccine (dpt-hep b-hib)', 'oral polio vaccine (opv)', 'pneumococcal conjugate vaccine (pcv)') AND s."doseNumber" = 1 THEN '1 1/2 months'
    WHEN LOWER(v."name") IN ('pentavalent', 'pentavalent vaccine (dpt-hep b-hib)', 'oral polio vaccine (opv)', 'pneumococcal conjugate vaccine (pcv)') AND s."doseNumber" = 2 THEN '2 1/2 months'
    WHEN LOWER(v."name") IN ('pentavalent', 'pentavalent vaccine (dpt-hep b-hib)', 'oral polio vaccine (opv)', 'pneumococcal conjugate vaccine (pcv)') AND s."doseNumber" = 3 THEN '3 1/2 months'
    WHEN LOWER(v."name") IN ('ipv', 'inactivated polio vaccine (ipv)') AND s."doseNumber" = 1 THEN '3 1/2 months'
    WHEN LOWER(v."name") IN ('ipv', 'inactivated polio vaccine (ipv)') AND s."doseNumber" = 2 THEN '9 months'
    WHEN LOWER(v."name") IN ('mmr', 'measles, mumps, rubella vaccine (mmr)') AND s."doseNumber" = 1 THEN '9 months'
    WHEN LOWER(v."name") IN ('mmr', 'measles, mumps, rubella vaccine (mmr)') AND s."doseNumber" = 2 THEN '1 year'
    ELSE COALESCE("recommendedAgeLabel", CONCAT(COALESCE(s."recommendedAgeInMonths", 0), ' months'))
  END,
  "dueDaysFromBirth" = CASE
    WHEN LOWER(v."name") = 'bcg' THEN 0
    WHEN LOWER(v."name") = 'hepatitis b vaccine' THEN 0
    WHEN LOWER(v."name") IN ('pentavalent', 'pentavalent vaccine (dpt-hep b-hib)', 'oral polio vaccine (opv)', 'pneumococcal conjugate vaccine (pcv)') AND s."doseNumber" = 1 THEN 45
    WHEN LOWER(v."name") IN ('pentavalent', 'pentavalent vaccine (dpt-hep b-hib)', 'oral polio vaccine (opv)', 'pneumococcal conjugate vaccine (pcv)') AND s."doseNumber" = 2 THEN 75
    WHEN LOWER(v."name") IN ('pentavalent', 'pentavalent vaccine (dpt-hep b-hib)', 'oral polio vaccine (opv)', 'pneumococcal conjugate vaccine (pcv)') AND s."doseNumber" = 3 THEN 105
    WHEN LOWER(v."name") IN ('ipv', 'inactivated polio vaccine (ipv)') AND s."doseNumber" = 1 THEN 105
    WHEN LOWER(v."name") IN ('ipv', 'inactivated polio vaccine (ipv)') AND s."doseNumber" = 2 THEN 270
    WHEN LOWER(v."name") IN ('mmr', 'measles, mumps, rubella vaccine (mmr)') AND s."doseNumber" = 1 THEN 270
    WHEN LOWER(v."name") IN ('mmr', 'measles, mumps, rubella vaccine (mmr)') AND s."doseNumber" = 2 THEN 365
    ELSE COALESCE(s."recommendedAgeInMonths", 0) * 30
  END
FROM "Vaccine" v
WHERE s."vaccineId" = v."id";

ALTER TABLE "ImmunizationSchedule"
  ALTER COLUMN "recommendedAgeLabel" SET NOT NULL,
  ALTER COLUMN "dueDaysFromBirth" SET NOT NULL;

ALTER TABLE "ImmunizationRecord"
  ADD COLUMN IF NOT EXISTS "scheduleLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "statusNotificationSentAt" TIMESTAMP(3);

UPDATE "ImmunizationRecord"
SET "scheduleLabel" = COALESCE("scheduleLabel", "dose")
WHERE "scheduleLabel" IS NULL;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "childId" INTEGER,
  "recordId" INTEGER,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "emailStatus" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "emailedAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" INTEGER,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey') THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_childId_fkey') THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_childId_fkey"
      FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_recordId_fkey') THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_recordId_fkey"
      FOREIGN KEY ("recordId") REFERENCES "ImmunizationRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_userId_fkey') THEN
    ALTER TABLE "AuditLog"
      ADD CONSTRAINT "AuditLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "Vaccine_code_key" ON "Vaccine"("code");
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
