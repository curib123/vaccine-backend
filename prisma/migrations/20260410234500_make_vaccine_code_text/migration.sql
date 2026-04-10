ALTER TABLE "Vaccine"
  ALTER COLUMN "code" TYPE TEXT USING "code"::text;

DROP TYPE IF EXISTS "VaccineCode";
