import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ServiceMetrics } from '../observability/service-metrics';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: ServiceMetrics,
  ) {}

  live() {
    return { status: 'ok' as const, service: 'server-service' };
  }

  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' as const, service: 'server-service', checks: { database: 'ok' } };
  }

  snapshot() {
    return this.metrics.snapshot();
  }
}
