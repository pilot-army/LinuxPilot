-- Fail fast if case-insensitive username collisions exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User"
    GROUP BY lower(btrim(username))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot migrate usernames: case-insensitive duplicates exist (e.g. Admin vs admin). Resolve conflicts before applying this migration.';
  END IF;
END $$;

-- Username canonical uniqueness
ALTER TABLE "User" ADD COLUMN "usernameNormalized" TEXT;

UPDATE "User"
SET "usernameNormalized" = lower(btrim(username));

ALTER TABLE "User" ALTER COLUMN "usernameNormalized" SET NOT NULL;

CREATE UNIQUE INDEX "User_usernameNormalized_key" ON "User"("usernameNormalized");
CREATE INDEX "User_usernameNormalized_idx" ON "User"("usernameNormalized");

DROP INDEX IF EXISTS "User_username_key";
DROP INDEX IF EXISTS "User_username_idx";

-- Refresh token family / reuse detection
ALTER TABLE "Session" ADD COLUMN "familyId" UUID;
ALTER TABLE "Session" ADD COLUMN "previousRefreshTokenHash" TEXT;
ALTER TABLE "Session" ADD COLUMN "refreshVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Session" ADD COLUMN "rotatedAt" TIMESTAMP(3);

UPDATE "Session" SET "familyId" = "id" WHERE "familyId" IS NULL;

ALTER TABLE "Session" ALTER COLUMN "familyId" SET NOT NULL;

CREATE INDEX "Session_familyId_idx" ON "Session"("familyId");
CREATE INDEX "Session_previousRefreshTokenHash_idx" ON "Session"("previousRefreshTokenHash");

CREATE TABLE "UsedRefreshToken" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsedRefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UsedRefreshToken_tokenHash_key" ON "UsedRefreshToken"("tokenHash");
CREATE INDEX "UsedRefreshToken_familyId_idx" ON "UsedRefreshToken"("familyId");
CREATE INDEX "UsedRefreshToken_sessionId_idx" ON "UsedRefreshToken"("sessionId");

ALTER TABLE "UsedRefreshToken"
  ADD CONSTRAINT "UsedRefreshToken_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Audit log
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
