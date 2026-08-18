import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  generateAgentKeyPair,
  generateEnrollmentToken,
  hashEnrollmentToken,
  signAgentRequest,
  verifyAgentSignature,
} from './agent-auth';

describe('agent-auth', () => {
  it('generates one-way enrollment token hashes', () => {
    const { token, hash } = generateEnrollmentToken();
    assert.equal(hash, hashEnrollmentToken(token));
    assert.notEqual(hash, token);
    assert.equal(hash.length, 64);
  });

  it('verifies an Ed25519 request signature', () => {
    const keys = generateAgentKeyPair();
    const body = JSON.stringify({ ok: true });
    const signed = signAgentRequest(
      keys.privateKeyPem,
      'cred-1',
      'POST',
      '/api/v1/agent/heartbeat',
      body,
    );
    assert.equal(
      verifyAgentSignature(
        keys.publicKeyPem,
        'POST',
        '/api/v1/agent/heartbeat',
        signed.timestamp,
        signed.nonce,
        signed.signature,
        body,
      ),
      true,
    );
  });

  it('rejects a mutated body, path, or method', () => {
    const keys = generateAgentKeyPair();
    const body = JSON.stringify({ cpu: 1 });
    const signed = signAgentRequest(
      keys.privateKeyPem,
      'cred-1',
      'POST',
      '/api/v1/agent/heartbeat',
      body,
    );
    assert.equal(
      verifyAgentSignature(
        keys.publicKeyPem,
        'POST',
        '/api/v1/agent/heartbeat',
        signed.timestamp,
        signed.nonce,
        signed.signature,
        JSON.stringify({ cpu: 2 }),
      ),
      false,
    );
    assert.equal(
      verifyAgentSignature(
        keys.publicKeyPem,
        'PUT',
        '/api/v1/agent/heartbeat',
        signed.timestamp,
        signed.nonce,
        signed.signature,
        body,
      ),
      false,
    );
    assert.equal(
      verifyAgentSignature(
        keys.publicKeyPem,
        'POST',
        '/api/v1/agent/heartbeat?x=1',
        signed.timestamp,
        signed.nonce,
        signed.signature,
        body,
      ),
      false,
    );
  });
});
