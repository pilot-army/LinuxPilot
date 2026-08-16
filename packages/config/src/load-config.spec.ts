import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { loadConfig, ConfigValidationError } from './load-config';
import { secretString } from './helpers';

const schema = z.object({
  JWT_ACCESS_SECRET: secretString('JWT_ACCESS_SECRET'),
  PORT: z.coerce.number({ required_error: 'PORT is required' }).int().positive(),
});

describe('loadConfig', () => {
  it('returns parsed values when the environment is valid', () => {
    const config = loadConfig(schema, {
      JWT_ACCESS_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
      PORT: '3001',
    });

    assert.equal(config.JWT_ACCESS_SECRET, 'abcdefghijklmnopqrstuvwxyz123456');
    assert.equal(config.PORT, 3001);
  });

  it('throws a readable error when a required variable is missing', () => {
    assert.throws(
      () => loadConfig(schema, { PORT: '3001' }),
      (error: unknown) => {
        assert.ok(error instanceof ConfigValidationError);
        assert.match(error.message, /JWT_ACCESS_SECRET/);
        assert.match(error.message, /required|at least 32/i);
        return true;
      },
    );
  });

  it('does not substitute an implicit secret fallback', () => {
    assert.throws(() => loadConfig(schema, { JWT_ACCESS_SECRET: '', PORT: '3001' }));
  });
});
