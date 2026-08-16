import { PasswordService } from './password.service';
import { type AppConfigService } from '../../config/app-config.service';

describe('PasswordService', () => {
  const service = new PasswordService({
    env: {
      ARGON2_MEMORY_COST: 4096,
      ARGON2_TIME_COST: 2,
      ARGON2_PARALLELISM: 1,
    },
  } as AppConfigService);

  it('hashes and verifies a password with argon2id', async () => {
    const passwordHash = await service.hash('CorrectHorse-Battery9');
    await expect(service.verify(passwordHash, 'CorrectHorse-Battery9')).resolves.toBe(true);
    await expect(service.verify(passwordHash, 'wrong-password')).resolves.toBe(false);
  });

  it('rejects a weak password', () => {
    expect(() => service.assertPolicy('password')).toThrow(/too weak/);
  });
});
