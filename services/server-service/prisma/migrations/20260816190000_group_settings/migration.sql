-- Group tags, notifications, and optimistic concurrency.

ALTER TABLE "ServerGroup"
    ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
