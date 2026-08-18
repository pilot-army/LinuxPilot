import { Injectable } from '@nestjs/common';
import { type AuthenticatedUser } from '@linuxpilot/auth-contracts';
import { AppError } from '@linuxpilot/common';
import {
  AUTHORIZED_KEYS_DEFAULT,
  SERVER_ERROR_CODES,
  SSH_KEY_ALGORITHMS,
  SSH_KEY_STATUSES,
  SSH_KEY_TYPES,
  type AddPublicSshKeyRequest,
  type GenerateSshKeyRequest,
  type ImportPrivateSshKeyRequest,
  type InspectSshKeyRequest,
  type InstallSshKeyRequest,
  type ListSshKeysQuery,
  type RotateSshKeyRequest,
  type SshKey,
  type SshKeyDetail,
  type SshKeyListResponse,
  type SshKeyMutationResponse,
  type SshKeyPreview,
  type SshKeyServerResult,
  type SshKeySummary,
  type SshKeyUsagesResponse,
  type UpdateSshKeyRequest,
} from '@linuxpilot/server-contracts';
import { randomUUID } from 'node:crypto';
import {
  Prisma,
  SshKeyActivityType,
  SshKeyStatus,
  SshKeyUsageKind,
} from '../../generated/prisma-client';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit.types';
import { normalizeTags } from '../domain/tags';
import { encryptPrivateKey, wipe, type MasterKeyRing } from './envelope-crypto';
import { generateSshMaterial, inspectSshMaterial, looksLikeSshKeyMaterial } from './ssh-material';
import { isUsableStatus, toSshKey, toSshKeyDetail, toUsageCounts } from './ssh-keys.mapper';
import { assertSafeSshTarget, normalizeAuthorizedKeysPath } from './ssh-policy';

const includeUsages = { usages: true } as const;

@Injectable()
export class SshKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListSshKeysQuery): Promise<SshKeyListResponse> {
    const where: Prisma.SshKeyWhereInput = { deletedAt: null };
    if (query.q) {
      const needle = query.q.trim();
      where.OR = [
        { name: { contains: needle, mode: 'insensitive' } },
        { fingerprint: { contains: needle, mode: 'insensitive' } },
        { description: { contains: needle, mode: 'insensitive' } },
      ];
    }
    if (query.type) {
      where.type = toPrismaType(query.type);
    }
    if (query.algorithm) {
      where.algorithm = toPrismaAlgorithm(query.algorithm);
    }
    if (query.status) {
      where.status = toPrismaStatus(query.status);
    }
    if (query.usage === 'used') {
      where.usages = { some: {} };
    }
    if (query.usage === 'unused') {
      where.usages = { none: {} };
    }
    if (query.usable) {
      where.status = { in: [SshKeyStatus.ACTIVE, SshKeyStatus.UNUSED] };
    }

    const orderBy = orderFor(query.sort, query.order);
    const [rows, total, summary] = await Promise.all([
      this.prisma.sshKey.findMany({
        where,
        include: includeUsages,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.sshKey.count({ where }),
      this.summary(),
    ]);

    const items = rows
      .map((row) => toSshKey(row))
      .filter((item) => (query.usable ? isUsableStatus(item.status) : true));

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      summary,
    };
  }

  async summary(): Promise<SshKeySummary> {
    const rows = await this.prisma.sshKey.findMany({
      where: { deletedAt: null },
      include: includeUsages,
    });
    const mapped = rows.map((row) => toSshKey(row));
    return {
      total: mapped.length,
      used: mapped.filter((item) => item.usage.servers > 0).length,
      unused: mapped.filter((item) => item.usage.servers === 0).length,
      attention: mapped.filter((item) =>
        (
          [
            SSH_KEY_STATUSES.ROTATION_REQUIRED,
            SSH_KEY_STATUSES.EXPIRED,
            SSH_KEY_STATUSES.COMPROMISED,
            SSH_KEY_STATUSES.DELETING,
          ] as string[]
        ).includes(item.status),
      ).length,
      rotationDue: mapped.filter((item) => item.status === SSH_KEY_STATUSES.ROTATION_REQUIRED)
        .length,
      passwordAuthServers: 0,
    };
  }

  async getById(id: string): Promise<SshKeyDetail> {
    const row = await this.requireKey(id, true);
    return toSshKeyDetail(row);
  }

  async usages(id: string): Promise<SshKeyUsagesResponse> {
    const row = await this.requireKey(id, true);
    const dto = toSshKeyDetail(row);
    return { items: dto.usages, counts: dto.usage };
  }

  inspect(body: InspectSshKeyRequest): SshKeyPreview {
    if (body.privateKey && !looksLikeSshKeyMaterial(body.privateKey)) {
      throw new AppError(SERVER_ERROR_CODES.SSH_KEY_INVALID, 'Unsupported private key format', 400);
    }
    if (body.publicKey && !looksLikeSshKeyMaterial(body.publicKey)) {
      throw new AppError(SERVER_ERROR_CODES.SSH_KEY_INVALID, 'Unsupported public key format', 400);
    }
    const parsed = inspectSshMaterial(body);
    const preview: SshKeyPreview = {
      algorithm: parsed.algorithm,
      fingerprint: parsed.fingerprint,
      keySize: parsed.keySize,
      encrypted: parsed.encrypted,
      hasPublicKey: parsed.hasPublicKey,
      ready: parsed.hasPublicKey && (!parsed.hasPrivateKey || Boolean(parsed.privateKeyPem)),
    };
    if (parsed.privateKeyPem) {
      wipe(Buffer.from(parsed.privateKeyPem));
    }
    return preview;
  }

  async importPrivate(
    body: ImportPrivateSshKeyRequest,
    user: AuthenticatedUser,
    requestId?: string,
  ): Promise<SshKey> {
    if (!looksLikeSshKeyMaterial(body.privateKey)) {
      throw new AppError(SERVER_ERROR_CODES.SSH_KEY_INVALID, 'Unsupported private key format', 400);
    }
    const parsed = inspectSshMaterial({
      privateKey: body.privateKey,
      passphrase: body.passphrase,
    });
    const created = await this.persistKey({
      name: body.name,
      description: body.description ?? '',
      tags: normalizeTags(body.tags ?? []),
      type: SSH_KEY_TYPES.PRIVATE_KEY,
      source: 'import',
      parsed,
      user,
      requestId,
      action: AUDIT_ACTIONS.SSH_KEY_IMPORTED,
    });
    return created;
  }

  async addPublic(
    body: AddPublicSshKeyRequest,
    user: AuthenticatedUser,
    requestId?: string,
  ): Promise<SshKey> {
    const parsed = inspectSshMaterial({ publicKey: body.publicKey });
    return this.persistKey({
      name: body.name,
      description: body.description ?? '',
      tags: normalizeTags(body.tags ?? []),
      type: SSH_KEY_TYPES.PUBLIC_KEY,
      source: 'public',
      parsed,
      user,
      requestId,
      action: AUDIT_ACTIONS.SSH_KEY_CREATED,
    });
  }

  async generate(
    body: GenerateSshKeyRequest,
    user: AuthenticatedUser,
    requestId?: string,
  ): Promise<SshKey> {
    const parsed = generateSshMaterial({
      algorithm: body.algorithm ?? SSH_KEY_ALGORITHMS.ED25519,
      rsaBits: body.rsaBits,
      comment: body.comment,
    });
    return this.persistKey({
      name: body.name,
      description: body.description ?? '',
      tags: normalizeTags(body.tags ?? []),
      type: SSH_KEY_TYPES.GENERATED_KEYPAIR,
      source: 'generate',
      parsed,
      user,
      requestId,
      action: AUDIT_ACTIONS.SSH_KEY_CREATED,
    });
  }

  async update(
    id: string,
    body: UpdateSshKeyRequest,
    user: AuthenticatedUser,
    requestId?: string,
  ): Promise<SshKey> {
    const current = await this.requireKey(id);
    if (body.version !== undefined && body.version !== current.version) {
      throw new AppError(SERVER_ERROR_CODES.VERSION_CONFLICT, 'SSH key version conflict', 409);
    }
    const updated = await this.prisma.sshKey.update({
      where: { id },
      include: includeUsages,
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.tags !== undefined ? { tags: normalizeTags(body.tags) } : {}),
        ...(body.status !== undefined ? { status: toPrismaStatus(body.status) } : {}),
        version: { increment: 1 },
      },
    });
    await this.recordActivity(id, SshKeyActivityType.UPDATED, user.id);
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.SSH_KEY_UPDATED,
      targetType: 'ssh_key',
      targetId: id,
      requestId,
      metadata: { name: updated.name },
    });
    return toSshKey(updated);
  }

  async disable(id: string, user: AuthenticatedUser, requestId?: string): Promise<SshKey> {
    const current = await this.requireKey(id);
    const updated = await this.prisma.sshKey.update({
      where: { id: current.id },
      include: includeUsages,
      data: { status: SshKeyStatus.DISABLED, version: { increment: 1 } },
    });
    await this.recordActivity(id, SshKeyActivityType.DISABLED, user.id);
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.SSH_KEY_DISABLED,
      targetType: 'ssh_key',
      targetId: id,
      requestId,
      metadata: { name: updated.name },
    });
    return toSshKey(updated);
  }

  async remove(
    id: string,
    user: AuthenticatedUser,
    requestId?: string,
  ): Promise<{ success: true }> {
    const current = await this.requireKey(id, true);
    const counts = toUsageCounts(current.usages);
    if (counts.servers + counts.spaces + counts.templates + counts.bastions > 0) {
      throw new AppError(SERVER_ERROR_CODES.SSH_KEY_IN_USE, 'SSH key is still assigned', 409, [
        counts,
      ]);
    }
    await this.prisma.sshKey.update({
      where: { id },
      data: {
        status: SshKeyStatus.DELETING,
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
    await this.recordActivity(id, SshKeyActivityType.DELETED, user.id);
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.SSH_KEY_DELETED,
      targetType: 'ssh_key',
      targetId: id,
      requestId,
      metadata: { name: current.name },
    });
    return { success: true };
  }

  async install(
    id: string,
    body: InstallSshKeyRequest,
    user: AuthenticatedUser,
    requestId?: string,
  ): Promise<SshKeyMutationResponse> {
    const key = await this.requireKey(id, true);
    const dto = toSshKey(key);
    if (!isUsableStatus(dto.status)) {
      throw new AppError(SERVER_ERROR_CODES.SSH_KEY_DISABLED, 'SSH key cannot be installed', 409);
    }
    const sshUser = body.sshUser ?? 'linuxpilot';
    const path = normalizeAuthorizedKeysPath(
      body.authorizedKeysPath ?? AUTHORIZED_KEYS_DEFAULT,
      sshUser,
    );
    const servers = await this.resolveServers(body.serverIds, body.spaceId);
    const results: SshKeyServerResult[] = [];
    for (const server of servers) {
      assertSafeSshTarget(server.primaryIp, server.sshPort);
      await this.prisma.$transaction(async (tx) => {
        await tx.server.update({
          where: { id: server.id },
          data: { sshKeyId: key.id, sshUser },
        });
        await tx.sshKeyUsage.upsert({
          where: {
            sshKeyId_kind_targetId: {
              sshKeyId: key.id,
              kind: SshKeyUsageKind.SERVER,
              targetId: server.id,
            },
          },
          create: {
            sshKeyId: key.id,
            kind: SshKeyUsageKind.SERVER,
            targetId: server.id,
            label: server.name,
          },
          update: { label: server.name },
        });
      });
      results.push({
        serverId: server.id,
        name: server.name,
        success: true,
        status: 'assigned',
        authorizedKeysPath: path,
      });
    }
    await this.prisma.sshKey.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
        status: SshKeyStatus.ACTIVE,
        version: { increment: 1 },
      },
    });
    await this.recordActivity(id, SshKeyActivityType.INSTALLED, user.id, {
      servers: results.length,
    });
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.SSH_KEY_INSTALLED,
      targetType: 'ssh_key',
      targetId: id,
      requestId,
      metadata: { servers: results.length, path },
    });
    return { key: await this.getSafe(id), results };
  }

  async rotate(
    id: string,
    body: RotateSshKeyRequest,
    user: AuthenticatedUser,
    requestId?: string,
  ): Promise<SshKeyMutationResponse> {
    const current = await this.requireKey(id, true);
    const replacement = await this.requireKey(body.replacementKeyId, true);
    if (
      replacement.status === SshKeyStatus.DISABLED ||
      replacement.status === SshKeyStatus.COMPROMISED
    ) {
      throw new AppError(
        SERVER_ERROR_CODES.SSH_KEY_DISABLED,
        'Replacement key cannot be used',
        409,
      );
    }
    const sshUser = body.sshUser ?? 'linuxpilot';
    const path = normalizeAuthorizedKeysPath(
      body.authorizedKeysPath ?? AUTHORIZED_KEYS_DEFAULT,
      sshUser,
    );
    const assigned = current.usages.filter((usage) => usage.kind === SshKeyUsageKind.SERVER);
    const targetIds = body.serverIds?.length
      ? body.serverIds
      : assigned.map((usage) => usage.targetId);
    const servers = await this.resolveServers(targetIds);
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.SSH_KEY_ROTATION_STARTED,
      targetType: 'ssh_key',
      targetId: id,
      requestId,
      metadata: { replacementKeyId: replacement.id, servers: servers.length },
    });

    const results: SshKeyServerResult[] = [];
    for (const server of servers) {
      try {
        assertSafeSshTarget(server.primaryIp, server.sshPort);
        await this.prisma.$transaction(async (tx) => {
          await tx.server.update({
            where: { id: server.id },
            data: { sshKeyId: replacement.id, sshUser },
          });
          await tx.sshKeyUsage.deleteMany({
            where: {
              sshKeyId: current.id,
              kind: SshKeyUsageKind.SERVER,
              targetId: server.id,
            },
          });
          await tx.sshKeyUsage.upsert({
            where: {
              sshKeyId_kind_targetId: {
                sshKeyId: replacement.id,
                kind: SshKeyUsageKind.SERVER,
                targetId: server.id,
              },
            },
            create: {
              sshKeyId: replacement.id,
              kind: SshKeyUsageKind.SERVER,
              targetId: server.id,
              label: server.name,
            },
            update: { label: server.name },
          });
        });
        results.push({
          serverId: server.id,
          name: server.name,
          success: true,
          status: 'rotated',
          authorizedKeysPath: path,
        });
      } catch (cause) {
        results.push({
          serverId: server.id,
          name: server.name,
          success: false,
          status: 'failed',
          errorCode: cause instanceof AppError ? cause.code : SERVER_ERROR_CODES.INTERNAL_ERROR,
        });
      }
    }

    const failed = results.some((item) => !item.success);
    if (!failed) {
      const remaining = await this.prisma.sshKeyUsage.count({ where: { sshKeyId: current.id } });
      await this.prisma.sshKey.update({
        where: { id: current.id },
        data: {
          status: remaining === 0 ? SshKeyStatus.UNUSED : SshKeyStatus.ROTATION_REQUIRED,
          rotatedAt: new Date(),
          version: { increment: 1 },
        },
      });
      await this.prisma.sshKey.update({
        where: { id: replacement.id },
        data: {
          status: SshKeyStatus.ACTIVE,
          lastUsedAt: new Date(),
          version: { increment: 1 },
        },
      });
      await this.recordActivity(current.id, SshKeyActivityType.ROTATED, user.id, {
        replacementKeyId: replacement.id,
      });
      await this.audit.record({
        actorId: user.id,
        action: AUDIT_ACTIONS.SSH_KEY_ROTATED,
        targetType: 'ssh_key',
        targetId: current.id,
        requestId,
        metadata: { replacementKeyId: replacement.id, servers: results.length },
      });
    }
    return { key: await this.getSafe(id), results };
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.sshKey.updateMany({
      where: { id, deletedAt: null },
      data: { lastUsedAt: new Date() },
    });
  }

  private async persistKey(input: {
    name: string;
    description: string;
    tags: string[];
    type: (typeof SSH_KEY_TYPES)[keyof typeof SSH_KEY_TYPES];
    source: string;
    parsed: ReturnType<typeof inspectSshMaterial>;
    user: AuthenticatedUser;
    requestId?: string;
    action: string;
  }): Promise<SshKey> {
    const duplicate = await this.prisma.sshKey.findFirst({
      where: { fingerprint: input.parsed.fingerprint, deletedAt: null },
    });
    if (duplicate) {
      throw new AppError(
        SERVER_ERROR_CODES.SSH_KEY_DUPLICATE,
        `This SSH key is already saved as «${duplicate.name}».`,
        409,
        [{ existingId: duplicate.id, existingName: duplicate.name }],
      );
    }

    const id = randomUUID();
    let encryptedPrivateKey: Buffer | undefined;
    let wrappedDek: Buffer | undefined;
    let nonce: Buffer | undefined;
    let wrapNonce: Buffer | undefined;
    let encryptionKeyVersion: string | undefined;
    if (input.parsed.privateKeyPem) {
      const plaintext = Buffer.from(input.parsed.privateKeyPem);
      const sealed = encryptPrivateKey(plaintext, this.masterRing(), `ssh-key:${id}`);
      wipe(plaintext);
      encryptedPrivateKey = sealed.ciphertext;
      wrappedDek = sealed.wrappedDek;
      nonce = sealed.nonce;
      wrapNonce = sealed.wrapNonce;
      encryptionKeyVersion = sealed.keyVersion;
    }

    const created = await this.prisma.sshKey.create({
      include: includeUsages,
      data: {
        id,
        name: input.name,
        description: input.description,
        type: toPrismaType(input.type),
        algorithm: toPrismaAlgorithm(input.parsed.algorithm),
        keySize: input.parsed.keySize,
        fingerprint: input.parsed.fingerprint,
        publicKey: input.parsed.publicKey,
        encryptedPrivateKey,
        wrappedDek,
        nonce,
        wrapNonce,
        encryptionKeyVersion,
        tags: input.tags,
        source: input.source,
        createdByUserId: input.user.id,
        status: SshKeyStatus.UNUSED,
      },
    });
    await this.recordActivity(
      id,
      input.source === 'import' ? SshKeyActivityType.IMPORTED : SshKeyActivityType.CREATED,
      input.user.id,
    );
    await this.audit.record({
      actorId: input.user.id,
      action: input.action,
      targetType: 'ssh_key',
      targetId: id,
      requestId: input.requestId,
      metadata: {
        name: created.name,
        algorithm: input.parsed.algorithm,
        fingerprint: created.fingerprint,
        type: input.type,
      },
    });
    return toSshKey(created);
  }

  private async requireKey(id: string, withActivity = false) {
    const row = await this.prisma.sshKey.findFirst({
      where: { id, deletedAt: null },
      include: {
        usages: true,
        activities: withActivity ? { orderBy: { createdAt: 'desc' }, take: 40 } : undefined,
      },
    });
    if (!row) {
      throw new AppError(SERVER_ERROR_CODES.SSH_KEY_NOT_FOUND, 'SSH key not found', 404);
    }
    return row;
  }

  private async getSafe(id: string): Promise<SshKey> {
    const row = await this.requireKey(id);
    return toSshKey(row);
  }

  private async resolveServers(serverIds?: string[], spaceId?: string) {
    const where: Prisma.ServerWhereInput = { deletedAt: null };
    if (serverIds?.length) {
      where.id = { in: serverIds };
    } else if (spaceId) {
      where.spaceId = spaceId;
    } else {
      throw new AppError(SERVER_ERROR_CODES.VALIDATION_ERROR, 'Select servers or a space', 400);
    }
    const servers = await this.prisma.server.findMany({
      where,
      select: { id: true, name: true, primaryIp: true, sshPort: true },
    });
    if (serverIds?.length && servers.length !== serverIds.length) {
      throw new AppError(SERVER_ERROR_CODES.NOT_FOUND, 'One or more servers were not found', 404);
    }
    return servers;
  }

  private async recordActivity(
    sshKeyId: string,
    type: SshKeyActivityType,
    actorId?: string,
    metadata?: Record<string, string | number | boolean>,
  ) {
    await this.prisma.sshKeyActivity.create({
      data: { sshKeyId, type, actorId, metadata },
    });
  }

  private masterRing(): MasterKeyRing {
    return {
      current: {
        version: this.config.env.SSH_KEYS_MASTER_KEY_VERSION,
        secret: this.config.env.SSH_KEYS_MASTER_KEY,
      },
      previous: this.config.env.SSH_KEYS_MASTER_KEY_PREVIOUS
        ? {
            version: this.config.env.SSH_KEYS_MASTER_KEY_PREVIOUS_VERSION ?? 'v0',
            secret: this.config.env.SSH_KEYS_MASTER_KEY_PREVIOUS,
          }
        : undefined,
    };
  }
}

function toPrismaType(value: string) {
  switch (value) {
    case SSH_KEY_TYPES.PUBLIC_KEY:
      return 'PUBLIC_KEY' as const;
    case SSH_KEY_TYPES.GENERATED_KEYPAIR:
      return 'GENERATED_KEYPAIR' as const;
    case SSH_KEY_TYPES.SSH_AGENT:
      return 'SSH_AGENT' as const;
    case SSH_KEY_TYPES.EXTERNAL_PROVIDER:
      return 'EXTERNAL_PROVIDER' as const;
    default:
      return 'PRIVATE_KEY' as const;
  }
}

function toPrismaAlgorithm(value: string) {
  if (value === 'rsa') {
    return 'RSA' as const;
  }
  if (value === 'ecdsa') {
    return 'ECDSA' as const;
  }
  return 'ED25519' as const;
}

function toPrismaStatus(value: string) {
  switch (value) {
    case SSH_KEY_STATUSES.ACTIVE:
      return SshKeyStatus.ACTIVE;
    case SSH_KEY_STATUSES.ROTATION_REQUIRED:
      return SshKeyStatus.ROTATION_REQUIRED;
    case SSH_KEY_STATUSES.EXPIRED:
      return SshKeyStatus.EXPIRED;
    case SSH_KEY_STATUSES.DISABLED:
      return SshKeyStatus.DISABLED;
    case SSH_KEY_STATUSES.COMPROMISED:
      return SshKeyStatus.COMPROMISED;
    case SSH_KEY_STATUSES.DELETING:
      return SshKeyStatus.DELETING;
    default:
      return SshKeyStatus.UNUSED;
  }
}

function orderFor(sort: ListSshKeysQuery['sort'], order: 'asc' | 'desc') {
  if (sort === 'name') {
    return { name: order };
  }
  if (sort === 'lastUsedAt') {
    return { lastUsedAt: order };
  }
  if (sort === 'rotatedAt') {
    return { rotatedAt: order };
  }
  if (sort === 'serverCount') {
    return { usages: { _count: order } };
  }
  return { createdAt: order };
}
