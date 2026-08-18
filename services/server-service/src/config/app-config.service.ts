import { Injectable } from '@nestjs/common';
import { loadServerEnv } from './env';
import { type ServerEnv } from './env.schema';

@Injectable()
export class AppConfigService {
  readonly env: ServerEnv;

  constructor() {
    this.env = loadServerEnv();
  }

  nowMs(): number {
    return Date.now();
  }
}
