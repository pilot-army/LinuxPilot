#!/usr/bin/env node
import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const target = resolve(process.cwd(), 'secrets');
mkdirSync(target, { recursive: true });

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const marker = '# LINUXPILOT_DEV_ONLY\n';
writeFileSync(resolve(target, 'jwt-private.pem'), `${marker}${privateKey}`, { mode: 0o600 });
writeFileSync(resolve(target, 'jwt-public.pem'), `${marker}${publicKey}`, { mode: 0o644 });

console.log(`Wrote development JWT keys to ${target}`);
console.log('Do not use these files in production. They are local development material only.');
