import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAddressInUse, listenWithRetry } from './listen';

describe('listen helpers', () => {
  it('detects EADDRINUSE', () => {
    assert.equal(isAddressInUse({ code: 'EADDRINUSE' }), true);
    assert.equal(isAddressInUse({ code: 'ECONNREFUSED' }), false);
    assert.equal(isAddressInUse('nope'), false);
  });

  it('retries until the port is free', async () => {
    let attempts = 0;
    const retries: number[] = [];
    const server = await listenWithRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw Object.assign(new Error('busy'), { code: 'EADDRINUSE' });
        }
        return 'ok';
      },
      {
        delayMs: 1,
        onRetry: (attempt) => {
          retries.push(attempt);
        },
      },
    );

    assert.equal(server, 'ok');
    assert.equal(attempts, 3);
    assert.deepEqual(retries, [1, 2]);
  });

  it('does not retry unrelated listen errors', async () => {
    await assert.rejects(
      () =>
        listenWithRetry(async () => {
          throw Object.assign(new Error('denied'), { code: 'EACCES' });
        }),
      /denied/,
    );
  });
});
