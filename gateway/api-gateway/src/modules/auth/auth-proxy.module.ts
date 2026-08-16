import { Module } from '@nestjs/common';
import { AuthClientService } from './auth-client.service';
import { AuthProxyController } from './auth-proxy.controller';
import { CookieService } from './cookie.service';

@Module({
  controllers: [AuthProxyController],
  providers: [AuthClientService, CookieService],
})
export class AuthProxyModule {}
