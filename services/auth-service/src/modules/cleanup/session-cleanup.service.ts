import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { type AppLogger } from '@linuxpilot/logger';
import { AppConfigService } from '../../config/app-config.service';
import { LOGGER } from '../../common/logger/logger.token';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SessionsService } from '../sessions/sessions.service';

const CLEANUP_LOCK_KEY = 0x4c50_0001;
const BATCH_SIZE = 500;

@Injectable()
export class SessionCleanupService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly sessionsService: SessionsService,
    private readonly auditService: AuditService,
    @Inject(LOGGER) private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.runSafe();
    }, this.config.env.SESSION_CLEANUP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async runSafe(): Promise<void> {
    try {
      await this.run();
    } catch (error) {
      this.logger.error({ err: error }, 'Session cleanup failed');
    }
  }

  async run(): Promise<{ expired: number; revoked: number; audit: number }> {
    const locked = await this.prisma.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_lock(${CLEANUP_LOCK_KEY}) AS locked
    `;
    if (!locked[0]?.locked) {
      return { expired: 0, revoked: 0, audit: 0 };
    }

    try {
      let expired = 0;
      let revoked = 0;
      let audit = 0;
      const retention = new Date(
        Date.now() - this.config.env.SESSION_REVOKED_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      const auditRetention = new Date(
        Date.now() - this.config.env.AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );

      for (;;) {
        const count = await this.sessionsService.deleteExpiredBatch(BATCH_SIZE);
        expired += count;
        if (count < BATCH_SIZE) {
          break;
        }
      }

      for (;;) {
        const count = await this.sessionsService.deleteRevokedBatch(retention, BATCH_SIZE);
        revoked += count;
        if (count < BATCH_SIZE) {
          break;
        }
      }

      for (;;) {
        const count = await this.auditService.deleteOlderThan(auditRetention, BATCH_SIZE);
        audit += count;
        if (count < BATCH_SIZE) {
          break;
        }
      }

      if (expired + revoked + audit > 0) {
        this.logger.info({ expired, revoked, audit }, 'Session and audit cleanup completed');
      }

      return { expired, revoked, audit };
    } finally {
      await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${CLEANUP_LOCK_KEY})`;
    }
  }
}
