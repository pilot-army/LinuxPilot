import { describe, expect, it, vi } from 'vitest';
import { submitLogin } from './submit-login';

describe('submitLogin', () => {
  it('forwards trimmed credentials to the authenticate adapter', async () => {
    const authenticate = vi.fn().mockResolvedValue(undefined);

    await submitLogin(
      { email: '  admin@example.com  ', password: 'secret', rememberMe: true },
      authenticate,
    );

    expect(authenticate).toHaveBeenCalledWith('admin@example.com', 'secret');
  });
});
