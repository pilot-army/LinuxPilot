import { Injectable } from '@nestjs/common';
import { loadGatewayEnv } from './env';
import { type GatewayEnv } from './env.schema';

@Injectable()
export class AppConfigService {
  readonly env: GatewayEnv;

  constructor() {
    this.env = loadGatewayEnv();
  }
}
