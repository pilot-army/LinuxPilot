import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign,
  timingSafeEqual,
  verify,
} from 'node:crypto';
import { HEADER_NAMES } from './constants';
import { buildServiceAuthCanonical, type ServiceAuthBody } from './service-auth';

export type AgentAuthHeaders = {
  credentialId: string;
  timestamp: string;
  nonce: string;
  signature: string;
};

export type AgentKeyPair = {
  publicKeyPem: string;
  privateKeyPem: string;
};

export function generateAgentKeyPair(): AgentKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}

export function hashEnrollmentToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateEnrollmentToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashEnrollmentToken(token) };
}

export function signAgentRequest(
  privateKeyPem: string,
  credentialId: string,
  method: string,
  pathAndQuery: string,
  body: ServiceAuthBody = '',
  now = Date.now(),
): AgentAuthHeaders {
  const timestamp = String(now);
  const nonce = randomBytes(16).toString('hex');
  const canonical = buildServiceAuthCanonical(method, pathAndQuery, timestamp, nonce, body);
  const signature = sign(null, Buffer.from(canonical), createPrivateKey(privateKeyPem)).toString(
    'base64',
  );
  return { credentialId, timestamp, nonce, signature };
}

export function agentAuthHeaderRecord(headers: AgentAuthHeaders): Record<string, string> {
  return {
    [HEADER_NAMES.agentCredentialId]: headers.credentialId,
    [HEADER_NAMES.agentTimestamp]: headers.timestamp,
    [HEADER_NAMES.agentNonce]: headers.nonce,
    [HEADER_NAMES.agentSignature]: headers.signature,
  };
}

export function verifyAgentSignature(
  publicKeyPem: string,
  method: string,
  pathAndQuery: string,
  timestamp: string,
  nonce: string,
  signature: string,
  body: ServiceAuthBody = '',
): boolean {
  const canonical = buildServiceAuthCanonical(method, pathAndQuery, timestamp, nonce, body);
  let signatureBytes: Buffer;
  try {
    signatureBytes = Buffer.from(signature, 'base64');
  } catch {
    return false;
  }
  if (signatureBytes.length !== 64) {
    return false;
  }
  try {
    return verify(null, Buffer.from(canonical), createPublicKey(publicKeyPem), signatureBytes);
  } catch {
    return false;
  }
}

export function safeEqualText(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}
