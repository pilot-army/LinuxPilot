import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module';
import { HealthModule } from '../health/health.module';
import { OperationsModule } from '../operations/operations.module';
import { UpdatesModule } from '../updates/updates.module';
import { AgentAuthService } from './agent-auth.service';
import { AgentController } from './agent.controller';
import { ServersController } from './servers.controller';
import { ServersService } from './servers.service';

@Module({
  imports: [HealthModule, GroupsModule, OperationsModule, UpdatesModule],
  controllers: [ServersController, AgentController],
  providers: [ServersService, AgentAuthService],
  exports: [ServersService],
})
export class ServersModule {}
