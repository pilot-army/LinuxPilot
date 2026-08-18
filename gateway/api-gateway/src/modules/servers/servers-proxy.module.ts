import { Module } from '@nestjs/common';
import { AgentProxyController } from './agent-proxy.controller';
import { ServerClientService } from './server-client.service';
import { ServerModulesProxyController } from './server-modules-proxy.controller';
import { ServersProxyController } from './servers-proxy.controller';

@Module({
  controllers: [ServersProxyController, ServerModulesProxyController, AgentProxyController],
  providers: [ServerClientService],
})
export class ServersProxyModule {}
