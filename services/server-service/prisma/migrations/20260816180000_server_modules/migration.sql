-- Additive inventory, groups, events, operations, updates, and agent status.

CREATE TYPE "AgentStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'NOT_INSTALLED', 'REVOKED', 'OUTDATED');
CREATE TYPE "OperationType" AS ENUM ('REBOOT', 'SHUTDOWN', 'REFRESH_INVENTORY', 'REFRESH_METRICS', 'CHECK_UPDATES', 'UPDATE_AGENT');
CREATE TYPE "OperationStatus" AS ENUM ('PENDING', 'DELIVERED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED');

ALTER TYPE "ServerStatus" ADD VALUE IF NOT EXISTS 'MAINTENANCE';

CREATE TABLE "ServerGroup" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServerGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServerGroup_name_key" ON "ServerGroup"("name");

ALTER TABLE "Server"
    ADD COLUMN "primaryIp" TEXT,
    ADD COLUMN "agentStatus" "AgentStatus" NOT NULL DEFAULT 'NOT_INSTALLED',
    ADD COLUMN "cpuCores" INTEGER,
    ADD COLUMN "memoryTotalBytes" BIGINT,
    ADD COLUMN "diskTotalBytes" BIGINT,
    ADD COLUMN "groupId" UUID,
    ADD COLUMN "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "maintenanceReason" TEXT,
    ADD COLUMN "maintenanceStartsAt" TIMESTAMP(3),
    ADD COLUMN "maintenanceEndsAt" TIMESTAMP(3),
    ADD COLUMN "maintenanceCreatedBy" UUID,
    ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "lastHealthStatus" TEXT,
    ADD COLUMN "lastHealthReasons" JSONB,
    ADD COLUMN "healthUpdatedAt" TIMESTAMP(3);

UPDATE "Server"
SET "agentStatus" = CASE
    WHEN "status" = 'REVOKED' THEN 'REVOKED'::"AgentStatus"
    WHEN "currentCredentialId" IS NULL THEN 'NOT_INSTALLED'::"AgentStatus"
    WHEN "status" IN ('ONLINE', 'DEGRADED') THEN 'CONNECTED'::"AgentStatus"
    WHEN "status" = 'OFFLINE' THEN 'DISCONNECTED'::"AgentStatus"
    ELSE 'DISCONNECTED'::"AgentStatus"
END;

ALTER TABLE "Server"
    ADD CONSTRAINT "Server_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "ServerGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Server_agentStatus_idx" ON "Server"("agentStatus");
CREATE INDEX "Server_hostname_idx" ON "Server"("hostname");
CREATE INDEX "Server_groupId_idx" ON "Server"("groupId");
CREATE INDEX "Server_maintenanceMode_idx" ON "Server"("maintenanceMode");

ALTER TABLE "EnrollmentToken" ADD COLUMN "revokedAt" TIMESTAMP(3);

ALTER TABLE "ServerMetric"
    ADD COLUMN "networkRxBytes" BIGINT,
    ADD COLUMN "networkTxBytes" BIGINT;

ALTER TABLE "ServerAuditLog" ADD COLUMN "result" TEXT NOT NULL DEFAULT 'success';
CREATE INDEX "ServerAuditLog_actorId_createdAt_idx" ON "ServerAuditLog"("actorId", "createdAt");

CREATE TABLE "ServerEvent" (
    "id" UUID NOT NULL,
    "serverId" UUID,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "messageKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServerEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ServerEvent"
    ADD CONSTRAINT "ServerEvent_serverId_fkey"
    FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ServerEvent_serverId_createdAt_idx" ON "ServerEvent"("serverId", "createdAt");
CREATE INDEX "ServerEvent_type_createdAt_idx" ON "ServerEvent"("type", "createdAt");
CREATE INDEX "ServerEvent_createdAt_idx" ON "ServerEvent"("createdAt");
CREATE INDEX "ServerEvent_source_idx" ON "ServerEvent"("source");

CREATE TABLE "ServerUpdateStatus" (
    "id" UUID NOT NULL,
    "serverId" UUID NOT NULL,
    "availableUpdates" INTEGER NOT NULL DEFAULT 0,
    "securityUpdates" INTEGER NOT NULL DEFAULT 0,
    "lastCheckedAt" TIMESTAMP(3),
    "rebootRequired" BOOLEAN NOT NULL DEFAULT false,
    "packages" JSONB,
    "currentAgentVersion" TEXT,
    "availableAgentVersion" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServerUpdateStatus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServerUpdateStatus_serverId_key" ON "ServerUpdateStatus"("serverId");

ALTER TABLE "ServerUpdateStatus"
    ADD CONSTRAINT "ServerUpdateStatus_serverId_fkey"
    FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ServerOperation" (
    "id" UUID NOT NULL,
    "serverId" UUID NOT NULL,
    "type" "OperationType" NOT NULL,
    "status" "OperationStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" UUID,
    "idempotencyKey" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "errorCode" TEXT,
    "result" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ServerOperation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServerOperation_serverId_idempotencyKey_key" ON "ServerOperation"("serverId", "idempotencyKey");
CREATE INDEX "ServerOperation_serverId_createdAt_idx" ON "ServerOperation"("serverId", "createdAt");
CREATE INDEX "ServerOperation_status_expiresAt_idx" ON "ServerOperation"("status", "expiresAt");
CREATE INDEX "ServerOperation_requestedBy_createdAt_idx" ON "ServerOperation"("requestedBy", "createdAt");

ALTER TABLE "ServerOperation"
    ADD CONSTRAINT "ServerOperation_serverId_fkey"
    FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
