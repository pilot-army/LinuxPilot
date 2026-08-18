-- CreateEnum
CREATE TYPE "SshKeyType" AS ENUM ('PRIVATE_KEY', 'PUBLIC_KEY', 'GENERATED_KEYPAIR', 'SSH_AGENT', 'EXTERNAL_PROVIDER');

-- CreateEnum
CREATE TYPE "SshKeyAlgorithm" AS ENUM ('ED25519', 'RSA', 'ECDSA');

-- CreateEnum
CREATE TYPE "SshKeyStatus" AS ENUM ('ACTIVE', 'UNUSED', 'ROTATION_REQUIRED', 'EXPIRED', 'DISABLED', 'COMPROMISED', 'DELETING');

-- CreateEnum
CREATE TYPE "SshKeyUsageKind" AS ENUM ('SERVER', 'SPACE', 'TEMPLATE', 'BASTION', 'OPERATION');

-- CreateEnum
CREATE TYPE "SshKeyActivityType" AS ENUM ('CREATED', 'IMPORTED', 'ASSIGNED', 'USED', 'UPDATED', 'ROTATED', 'DISABLED', 'DELETED', 'INSTALLED');

-- CreateTable
CREATE TABLE "SshKey" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" "SshKeyType" NOT NULL,
    "algorithm" "SshKeyAlgorithm" NOT NULL,
    "keySize" INTEGER,
    "fingerprint" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "encryptedPrivateKey" BYTEA,
    "wrappedDek" BYTEA,
    "nonce" BYTEA,
    "wrapNonce" BYTEA,
    "encryptionKeyVersion" TEXT,
    "status" "SshKeyStatus" NOT NULL DEFAULT 'UNUSED',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL DEFAULT 'import',
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3),
    "rotationDueAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SshKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SshKeyUsage" (
    "id" UUID NOT NULL,
    "sshKeyId" UUID NOT NULL,
    "kind" "SshKeyUsageKind" NOT NULL,
    "targetId" UUID NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SshKeyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SshKeyActivity" (
    "id" UUID NOT NULL,
    "sshKeyId" UUID NOT NULL,
    "type" "SshKeyActivityType" NOT NULL,
    "actorId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SshKeyActivity_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Server" ADD COLUMN "sshKeyId" UUID;
ALTER TABLE "Server" ADD COLUMN "sshUser" TEXT;
ALTER TABLE "Server" ADD COLUMN "sshPort" INTEGER;

-- CreateIndex
CREATE INDEX "SshKey_fingerprint_idx" ON "SshKey"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "SshKey_fingerprint_active_key" ON "SshKey"("fingerprint") WHERE "deletedAt" IS NULL;

-- CreateIndex
CREATE INDEX "SshKey_status_idx" ON "SshKey"("status");

-- CreateIndex
CREATE INDEX "SshKey_deletedAt_idx" ON "SshKey"("deletedAt");

-- CreateIndex
CREATE INDEX "SshKey_createdAt_idx" ON "SshKey"("createdAt");

-- CreateIndex
CREATE INDEX "SshKey_name_idx" ON "SshKey"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SshKeyUsage_sshKeyId_kind_targetId_key" ON "SshKeyUsage"("sshKeyId", "kind", "targetId");

-- CreateIndex
CREATE INDEX "SshKeyUsage_sshKeyId_idx" ON "SshKeyUsage"("sshKeyId");

-- CreateIndex
CREATE INDEX "SshKeyUsage_kind_targetId_idx" ON "SshKeyUsage"("kind", "targetId");

-- CreateIndex
CREATE INDEX "SshKeyActivity_sshKeyId_createdAt_idx" ON "SshKeyActivity"("sshKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "Server_sshKeyId_idx" ON "Server"("sshKeyId");

-- AddForeignKey
ALTER TABLE "Server" ADD CONSTRAINT "Server_sshKeyId_fkey" FOREIGN KEY ("sshKeyId") REFERENCES "SshKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SshKeyUsage" ADD CONSTRAINT "SshKeyUsage_sshKeyId_fkey" FOREIGN KEY ("sshKeyId") REFERENCES "SshKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SshKeyActivity" ADD CONSTRAINT "SshKeyActivity_sshKeyId_fkey" FOREIGN KEY ("sshKeyId") REFERENCES "SshKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
