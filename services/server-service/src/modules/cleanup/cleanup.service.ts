import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { type AppLogger } from '@linuxpilot/logger';
import { AppConfigService } from '../../config/app-config.service';
import { LOGGER } from '../../common/logger/logger.token';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsService } from '../events/events.service';
import { OperationsService } from '../operations/operations.service';
import { ServersService } from '../servers/servers.service';

const CLEANUP_LOCK_KEY = 0x4c50_0002;
const STATUS_LOCK_KEY = 0x4c50_0003;

@Injectable()
export class CleanupService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer: NodeJS.Timeout | undefined;
  private statusTimer: NodeJS.Timeout | undefined;

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly servers: ServersService,
    private readonly audit: AuditService,
    private readonly events: EventsService,
    private readonly operations: OperationsService,
    @Inject(LOGGER) private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    this.cleanupTimer = setInterval(() => {
      void this.runCleanupSafe();
    }, this.config.env.METRICS_CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
    this.statusTimer = setInterval(() => {
      void this.runStatusSafe();
    }, this.config.env.STATUS_SWEEP_INTERVAL_MS);
    this.statusTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.statusTimer) clearInterval(this.statusTimer);
  }

  async runCleanupSafe(): Promise<void> {
    try {
      await this.runCleanup();
    } catch (error) {
      this.logger.error({ err: error }, 'Server cleanup failed');
    }
  }

  async runStatusSafe(): Promise<void> {
    try {
      await this.runStatusSweep();
    } catch (error) {
      this.logger.error({ err: error }, 'Server status sweep failed');
    }
  }

  async runCleanup(): Promise<{ metrics: number; nonces: number; audit: number; events: number }> {
    const locked = await this.prisma.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_lock(${CLEANUP_LOCK_KEY}) AS locked
    `;
    if (!locked[0]?.locked) {
      return { metrics: 0, nonces: 0, audit: 0, events: 0 };
    }

    try {
      let metrics = 0;
      for (;;) {
        const count = await this.servers.cleanupMetricsBatch();
        metrics += count;
        if (count < this.config.env.METRICS_CLEANUP_BATCH_SIZE) {
          break;
        }
      }

      const nonceCutoff = new Date(Date.now() - this.config.env.AGENT_TIMESTAMP_WINDOW_MS * 2);
      const nonceResult = await this.prisma.agentNonce.deleteMany({
        where: { expiresAt: { lt: nonceCutoff } },
      });

      let audit = 0;
      const auditRetention = new Date(
        Date.now() - this.config.env.AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      for (;;) {
        const count = await this.audit.deleteOlderThan(auditRetention, 500);
        audit += count;
        if (count < 500) {
          break;
        }
      }

      let events = 0;
      const eventRetention = new Date(
        Date.now() - this.config.env.EVENTS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      for (;;) {
        const count = await this.events.deleteOlderThan(eventRetention, 500);
        events += count;
        if (count < 500) {
          break;
        }
      }

      if (metrics + nonceResult.count + audit + events > 0) {
        this.logger.info(
          { metrics, nonces: nonceResult.count, audit, events },
          'Server metrics and nonce cleanup completed',
        );
      }
      return { metrics, nonces: nonceResult.count, audit, events };
    } finally {
      await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${CLEANUP_LOCK_KEY})`;
    }
  }

  async runStatusSweep(): Promise<number> {
    const locked = await this.prisma.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_lock(${STATUS_LOCK_KEY}) AS locked
    `;
    if (!locked[0]?.locked) {
      return 0;
    }
    try {
      const marked = await this.servers.markOfflineBatch();
      await this.servers.endExpiredMaintenance();
      await this.operations.expireBatch();
      await this.servers.refreshStatusCounts();
      if (marked > 0) {
        this.logger.info({ marked }, 'Marked stale servers offline');
      }
      return marked;
    } finally {
      await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${STATUS_LOCK_KEY})`;
    }
  }
}
