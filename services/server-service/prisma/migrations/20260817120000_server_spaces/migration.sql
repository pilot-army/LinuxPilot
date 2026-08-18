-- Rename server groups to server spaces without dropping data.
-- Rollback: reverse the RENAME statements and drop slug/environment.

ALTER TABLE "ServerGroup" RENAME TO "ServerSpace";
ALTER INDEX "ServerGroup_pkey" RENAME TO "ServerSpace_pkey";
ALTER INDEX "ServerGroup_name_key" RENAME TO "ServerSpace_name_key";

ALTER TABLE "ServerSpace" ADD COLUMN "slug" TEXT;
ALTER TABLE "ServerSpace" ADD COLUMN "environment" TEXT;

UPDATE "ServerSpace"
SET "slug" = trim(both '-' from lower(regexp_replace(trim("name"), '[^a-zA-Z0-9]+', '-', 'g')));

UPDATE "ServerSpace"
SET "slug" = 'space-' || substr(replace("id"::text, '-', ''), 1, 8)
WHERE "slug" IS NULL OR "slug" = '';

UPDATE "ServerSpace" AS space
SET "slug" = space."slug" || '-' || substr(replace(space."id"::text, '-', ''), 1, 8)
WHERE space."id" IN (
  SELECT "id"
  FROM (
    SELECT "id", row_number() OVER (PARTITION BY "slug" ORDER BY "createdAt", "id") AS rn
    FROM "ServerSpace"
  ) ranked
  WHERE ranked.rn > 1
);

ALTER TABLE "ServerSpace" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "ServerSpace_slug_key" ON "ServerSpace"("slug");

ALTER TABLE "Server" RENAME COLUMN "groupId" TO "spaceId";
ALTER INDEX "Server_groupId_idx" RENAME TO "Server_spaceId_idx";
ALTER TABLE "Server" RENAME CONSTRAINT "Server_groupId_fkey" TO "Server_spaceId_fkey";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Server" server
    LEFT JOIN "ServerSpace" space ON space."id" = server."spaceId"
    WHERE server."spaceId" IS NOT NULL AND space."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'server space migration integrity check failed: spaceId without ServerSpace';
  END IF;
END $$;
