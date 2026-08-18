import { Module } from '@nestjs/common';
import { OperationsModule } from '../operations/operations.module';
import { ServersModule } from '../servers/servers.module';
import { CleanupService } from './cleanup.service';

@Module({
  imports: [ServersModule, OperationsModule],
  providers: [CleanupService],
})
export class CleanupModule {}
