-- Additive appearance identifier for server spaces.
-- Rollback: ALTER TABLE "ServerSpace" DROP COLUMN "icon";

ALTER TABLE "ServerSpace" ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'server';
