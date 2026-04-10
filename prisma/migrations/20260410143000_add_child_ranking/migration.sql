ALTER TABLE "Child"
  ADD COLUMN IF NOT EXISTS "ranking" INTEGER;

WITH ranked_children AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "parentId"
      ORDER BY "birthDate" ASC, "createdAt" ASC, id ASC
    ) AS calculated_ranking
  FROM "Child"
)
UPDATE "Child" c
SET "ranking" = r.calculated_ranking
FROM ranked_children r
WHERE c.id = r.id
  AND c."ranking" IS NULL;

ALTER TABLE "Child"
  ALTER COLUMN "ranking" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Child_parentId_ranking_idx"
  ON "Child"("parentId", "ranking");
