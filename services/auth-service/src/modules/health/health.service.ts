import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<{ status: 'ok'; service: string }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', service: 'auth-service' };
  }
}
