import { Module } from '@nestjs/common';
import { ServiceMetrics } from '../observability/service-metrics';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService, ServiceMetrics],
  exports: [ServiceMetrics],
})
export class HealthModule {}
