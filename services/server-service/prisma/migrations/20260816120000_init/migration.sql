-- CreateEnum
CREATE TYPE "ServerStatus" AS ENUM ('PENDING', 'ONLINE', 'DEGRADED', 'OFFLINE', 'REVOKED');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'REVOKED', 'ROTATED');

-- CreateEnum
CREATE TYPE "EnrollmentPurpose" AS ENUM ('ENROLL', 'ROTATE');

-- CreateTable
CREATE TABLE "Server" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "hostname" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "ServerStatus" NOT NULL DEFAULT 'PENDING',
    "osName" TEXT,
    "osVersion" TEXT,
    "kernelVersion" TEXT,
    "architecture" TEXT,
    "agentVersion" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentCredentialId" UUID,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCredential" (
    "id" UUID NOT NULL,
    "serverId" UUID NOT NULL,
    "publicKey" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "AgentCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentToken" (
    "id" UUID NOT NULL,
    "serverId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "EnrollmentPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerMetric" (
    "id" UUID NOT NULL,
    "serverId" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "cpuUsagePercent" DECIMAL(5,2),
    "load1" DECIMAL(8,2),
    "load5" DECIMAL(8,2),
    "load15" DECIMAL(8,2),
    "memoryUsedBytes" BIGINT,
    "memoryTotalBytes" BIGINT,
    "swapUsedBytes" BIGINT,
    "swapTotalBytes" BIGINT,
    "uptimeSeconds" BIGINT,
    "processCount" INTEGER,
    "disks" JSONB NOT NULL,
    "incomplete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ServerMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentNonce" (
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentNonce_pkey" PRIMARY KEY ("nonce")
);

-- CreateTable
CREATE TABLE "ServerAuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serverId" UUID,

    CONSTRAINT "ServerAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Server_status_idx" ON "Server"("status");

-- CreateIndex
CREATE INDEX "Server_deletedAt_idx" ON "Server"("deletedAt");

-- CreateIndex
CREATE INDEX "Server_lastSeenAt_idx" ON "Server"("lastSeenAt");

-- CreateIndex
CREATE INDEX "Server_createdByUserId_idx" ON "Server"("createdByUserId");

-- CreateIndex
CREATE INDEX "Server_name_idx" ON "Server"("name");

-- CreateIndex
CREATE INDEX "AgentCredential_serverId_status_idx" ON "AgentCredential"("serverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentToken_tokenHash_key" ON "EnrollmentToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EnrollmentToken_serverId_usedAt_idx" ON "EnrollmentToken"("serverId", "usedAt");

-- CreateIndex
CREATE INDEX "EnrollmentToken_expiresAt_idx" ON "EnrollmentToken"("expiresAt");

-- CreateIndex
CREATE INDEX "ServerMetric_serverId_timestamp_idx" ON "ServerMetric"("serverId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "ServerMetric_timestamp_idx" ON "ServerMetric"("timestamp");

-- CreateIndex
CREATE INDEX "AgentNonce_expiresAt_idx" ON "AgentNonce"("expiresAt");

-- CreateIndex
CREATE INDEX "ServerAuditLog_serverId_createdAt_idx" ON "ServerAuditLog"("serverId", "createdAt");

-- CreateIndex
CREATE INDEX "ServerAuditLog_action_idx" ON "ServerAuditLog"("action");

-- CreateIndex
CREATE INDEX "ServerAuditLog_createdAt_idx" ON "ServerAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ServerAuditLog_targetType_targetId_idx" ON "ServerAuditLog"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "AgentCredential" ADD CONSTRAINT "AgentCredential_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentToken" ADD CONSTRAINT "EnrollmentToken_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerMetric" ADD CONSTRAINT "ServerMetric_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerAuditLog" ADD CONSTRAINT "ServerAuditLog_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;
