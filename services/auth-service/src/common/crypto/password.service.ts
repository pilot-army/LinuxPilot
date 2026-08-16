import { Injectable } from '@nestjs/common';
import { hash, verify, argon2id } from 'argon2';
import { AppError } from '@linuxpilot/common';
import { evaluatePassword } from '@linuxpilot/common';
import { AUTH_ERROR_CODES } from '@linuxpilot/auth-contracts';
import { AppConfigService } from '../../config/app-config.service';

const DUMMY_PASSWORD = 'timing-safe-dummy-password';

@Injectable()
export class PasswordService {
  private dummyHashPromise: Promise<string> | null = null;

  constructor(private readonly config: AppConfigService) {}

  assertPolicy(password: string): void {
    const details = evaluatePassword(password);
    if (details.length > 0) {
      throw new AppError(AUTH_ERROR_CODES.VALIDATION_ERROR, 'Password is too weak', 400, details);
    }
  }

  async hash(password: string): Promise<string> {
    return hash(password, {
      type: argon2id,
      memoryCost: this.config.env.ARGON2_MEMORY_COST,
      timeCost: this.config.env.ARGON2_TIME_COST,
      parallelism: this.config.env.ARGON2_PARALLELISM,
    });
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  async verifyDummy(password: string): Promise<void> {
    const dummyHash = await this.getDummyHash();
    await this.verify(dummyHash, password);
  }

  private getDummyHash(): Promise<string> {
    this.dummyHashPromise ??= this.hash(DUMMY_PASSWORD);
    return this.dummyHashPromise;
  }
}
