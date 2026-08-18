import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { ServiceAuthGuard } from './common/guards/service-auth.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggerModule } from './common/logger/logger.module';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { CleanupModule } from './modules/cleanup/cleanup.module';
import { EventsModule } from './modules/events/events.module';
import { GroupsModule } from './modules/groups/groups.module';
import { HealthModule } from './modules/health/health.module';
import { OperationsModule } from './modules/operations/operations.module';
import { ServersModule } from './modules/servers/servers.module';
import { SshKeysModule } from './modules/ssh-keys/ssh-keys.module';
import { UpdatesModule } from './modules/updates/updates.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    PrismaModule,
    AuditModule,
    EventsModule,
    GroupsModule,
    OperationsModule,
    UpdatesModule,
    HealthModule,
    ServersModule,
    SshKeysModule,
    CleanupModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ServiceAuthGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
