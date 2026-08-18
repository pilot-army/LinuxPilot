-- Unify group/environment/space into ServerSpace.
-- Rollback:
--   ALTER TABLE "ServerSpace" ADD COLUMN "environment" TEXT;
--   UPDATE "ServerSpace" s
--   SET "environment" = r."old_environment"
--   FROM "_server_space_environment_migration_report" r
--   WHERE r."space_id" = s."id";

CREATE TABLE IF NOT EXISTS "_server_space_environment_migration_report" (
  "space_id" UUID NOT NULL,
  "space_name" TEXT NOT NULL,
  "space_slug" TEXT NOT NULL,
  "old_environment" TEXT,
  "action" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "_server_space_environment_migration_report" (
  "space_id",
  "space_name",
  "space_slug",
  "old_environment",
  "action"
)
SELECT
  "id",
  "name",
  "slug",
  "environment",
  CASE
    WHEN "environment" IS NULL THEN 'kept'
    ELSE 'environment_dropped'
  END
FROM "ServerSpace";

INSERT INTO "ServerSpace" (
  "id",
  "name",
  "slug",
  "description",
  "icon",
  "color",
  "tags",
  "notificationsEnabled",
  "version",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  defaults."name",
  defaults."slug",
  defaults."description",
  'server',
  defaults."color",
  ARRAY[]::TEXT[],
  TRUE,
  1,
  NOW(),
  NOW()
FROM (
  VALUES
    ('Production', 'production', 'Production servers', '#ef4444'),
    ('Staging', 'staging', 'Staging servers', '#f59e0b'),
    ('Development', 'development', 'Development servers', '#3b82f6')
) AS defaults("name", "slug", "description", "color")
WHERE NOT EXISTS (
  SELECT 1
  FROM "ServerSpace" existing
  WHERE existing."slug" = defaults."slug"
     OR lower(existing."name") = lower(defaults."name")
);

CREATE TABLE IF NOT EXISTS "_server_space_assignment_migration_report" (
  "server_id" UUID NOT NULL,
  "server_name" TEXT NOT NULL,
  "previous_space_id" UUID,
  "assigned_space_id" UUID,
  "assigned_space_slug" TEXT,
  "source" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "_server_space_assignment_migration_report" (
  "server_id",
  "server_name",
  "previous_space_id",
  "assigned_space_id",
  "assigned_space_slug",
  "source",
  "action"
)
SELECT
  s."id",
  s."name",
  s."spaceId",
  s."spaceId",
  existing_space."slug",
  'existing_space_id',
  'kept'
FROM "Server" s
LEFT JOIN "ServerSpace" existing_space ON existing_space."id" = s."spaceId"
WHERE s."deletedAt" IS NULL
  AND s."spaceId" IS NOT NULL;

WITH tag_matches AS (
  SELECT
    s."id" AS server_id,
    s."name" AS server_name,
    s."spaceId" AS previous_space_id,
    array_agg(DISTINCT mapped.slug ORDER BY mapped.slug) AS slugs
  FROM "Server" s
  CROSS JOIN LATERAL unnest(s."tags") AS tag(value)
  JOIN (
    VALUES
      ('production', 'production'),
      ('prod', 'production'),
      ('staging', 'staging'),
      ('stage', 'staging'),
      ('development', 'development'),
      ('dev', 'development')
  ) AS mapped(tag, slug) ON lower(tag.value) = mapped.tag
  WHERE s."deletedAt" IS NULL
    AND s."spaceId" IS NULL
  GROUP BY s."id", s."name", s."spaceId"
)
INSERT INTO "_server_space_assignment_migration_report" (
  "server_id",
  "server_name",
  "previous_space_id",
  "assigned_space_id",
  "assigned_space_slug",
  "source",
  "action"
)
SELECT
  tag_matches.server_id,
  tag_matches.server_name,
  tag_matches.previous_space_id,
  CASE
    WHEN cardinality(tag_matches.slugs) = 1 THEN space."id"
    ELSE NULL
  END,
  CASE
    WHEN cardinality(tag_matches.slugs) = 1 THEN tag_matches.slugs[1]
    ELSE NULL
  END,
  'legacy_environment_tag',
  CASE
    WHEN cardinality(tag_matches.slugs) = 1 THEN 'assigned_from_tag'
    ELSE 'conflict_skipped'
  END
FROM tag_matches
LEFT JOIN "ServerSpace" space
  ON cardinality(tag_matches.slugs) = 1
 AND space."slug" = tag_matches.slugs[1];

UPDATE "Server" s
SET
  "spaceId" = report."assigned_space_id",
  "version" = s."version" + 1
FROM "_server_space_assignment_migration_report" report
WHERE s."id" = report."server_id"
  AND report."action" = 'assigned_from_tag'
  AND report."assigned_space_id" IS NOT NULL
  AND s."spaceId" IS NULL;

ALTER TABLE "ServerSpace" DROP COLUMN IF EXISTS "environment";
