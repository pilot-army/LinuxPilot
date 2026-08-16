import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  signServiceRequest,
  verifyServiceSignature,
  serviceAuthTargetFromRequest,
  hashServiceAuthBody,
} from './service-auth';

const CURRENT = 'current-service-auth-secret-min-32-chars';
const PREVIOUS = 'previous-service-auth-secret-min-32-ch';
const BODY = '{"emailOrUsername":"admin"}';

describe('service auth signatures', () => {
  it('accepts a valid signature over method, path, query, timestamp, nonce, and body bytes', () => {
    const signed = signServiceRequest(
      CURRENT,
      'POST',
      '/auth/login?trace=1',
      BODY,
      1_700_000_000_000,
    );
    assert.equal(
      verifyServiceSignature(
        [CURRENT],
        'POST',
        '/auth/login?trace=1',
        signed.timestamp,
        signed.nonce,
        signed.signature,
        BODY,
      ),
      true,
    );
    assert.equal(signed.nonce.length, 32);
    assert.notEqual(
      signed.nonce,
      signServiceRequest(CURRENT, 'POST', '/auth/login?trace=1', BODY).nonce,
    );
  });

  it('rejects a mutated body', () => {
    const signed = signServiceRequest(CURRENT, 'POST', '/auth/login', BODY);
    assert.equal(
      verifyServiceSignature(
        [CURRENT],
        'POST',
        '/auth/login',
        signed.timestamp,
        signed.nonce,
        signed.signature,
        '{"emailOrUsername":"other"}',
      ),
      false,
    );
  });

  it('rejects a mutated path', () => {
    const signed = signServiceRequest(CURRENT, 'POST', '/auth/login', BODY);
    assert.equal(
      verifyServiceSignature(
        [CURRENT],
        'POST',
        '/auth/refresh',
        signed.timestamp,
        signed.nonce,
        signed.signature,
        BODY,
      ),
      false,
    );
  });

  it('rejects a mutated query string', () => {
    const signed = signServiceRequest(CURRENT, 'GET', '/auth/me?limit=1', '');
    assert.equal(
      verifyServiceSignature(
        [CURRENT],
        'GET',
        '/auth/me?limit=2',
        signed.timestamp,
        signed.nonce,
        signed.signature,
        '',
      ),
      false,
    );
  });

  it('rejects a mutated HTTP method', () => {
    const signed = signServiceRequest(CURRENT, 'GET', '/auth/me', '');
    assert.equal(
      verifyServiceSignature(
        [CURRENT],
        'DELETE',
        '/auth/me',
        signed.timestamp,
        signed.nonce,
        signed.signature,
        '',
      ),
      false,
    );
  });

  it('signs GET requests as the hash of an empty body', () => {
    const signed = signServiceRequest(CURRENT, 'GET', '/auth/me', '');
    assert.equal(
      verifyServiceSignature(
        [CURRENT],
        'GET',
        '/auth/me',
        signed.timestamp,
        signed.nonce,
        signed.signature,
        Buffer.alloc(0),
      ),
      true,
    );
    assert.equal(hashServiceAuthBody(''), hashServiceAuthBody(Buffer.alloc(0)));
  });

  it('accepts the previous secret during rotation', () => {
    const signed = signServiceRequest(PREVIOUS, 'POST', '/auth/refresh', '{}');
    assert.equal(
      verifyServiceSignature(
        [CURRENT, PREVIOUS],
        'POST',
        '/auth/refresh',
        signed.timestamp,
        signed.nonce,
        signed.signature,
        '{}',
      ),
      true,
    );
  });

  it('rejects a random signature', () => {
    const signed = signServiceRequest(CURRENT, 'POST', '/auth/login', BODY);
    assert.equal(
      verifyServiceSignature(
        [CURRENT],
        'POST',
        '/auth/login',
        signed.timestamp,
        signed.nonce,
        'ab'.repeat(32),
        BODY,
      ),
      false,
    );
  });

  it('builds the request target from pathname plus the original query string', () => {
    assert.equal(
      serviceAuthTargetFromRequest('/auth/me', '/auth/me?role=admin#frag'),
      '/auth/me?role=admin',
    );
    assert.equal(serviceAuthTargetFromRequest('/auth/me', '/auth/me'), '/auth/me');
  });
});
