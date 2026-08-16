import { Injectable } from '@nestjs/common';
import { loadAuthEnv } from './env';
import { type AuthEnv } from './env.schema';

@Injectable()
export class AppConfigService {
  readonly env: AuthEnv;

  constructor() {
    this.env = loadAuthEnv();
  }

  nowMs(): number {
    return Date.now();
  }
}
