DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ImmunizationRecord_visitId_fkey'
  ) THEN
    ALTER TABLE "ImmunizationRecord"
      DROP CONSTRAINT "ImmunizationRecord_visitId_fkey";
  END IF;
END
$$;

ALTER TABLE "ImmunizationRecord"
  DROP COLUMN IF EXISTS "visitId";

DROP TABLE IF EXISTS "ImmunizationVisit";
