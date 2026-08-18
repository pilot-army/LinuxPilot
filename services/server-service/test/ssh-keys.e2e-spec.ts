import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { execFileSync } from 'node:child_process';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { generateSshMaterial } from '../src/modules/ssh-keys/ssh-material';
import { accessToken, adminToken, authHeaders, viewerToken } from './helpers';

describe('SSH keys e2e', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: __dirname + '/..',
      env: process.env,
      stdio: 'inherit',
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ rawBody: true });
    app.useBodyParser('json', { limit: '64kb' });
    const { requestIdMiddleware } = await import('../src/common/middleware/request-id.middleware');
    app.use(requestIdMiddleware);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.serverOperation.deleteMany();
    await prisma.serverEvent.deleteMany();
    await prisma.serverUpdateStatus.deleteMany();
    await prisma.serverMetric.deleteMany();
    await prisma.enrollmentToken.deleteMany();
    await prisma.agentNonce.deleteMany();
    await prisma.agentCredential.deleteMany();
    await prisma.serverAuditLog.deleteMany();
    await prisma.sshKeyActivity.deleteMany();
    await prisma.sshKeyUsage.deleteMany();
    await prisma.server.deleteMany();
    await prisma.sshKey.deleteMany();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('lists an empty catalog without requiring servers', async () => {
    const response = await request(app.getHttpServer())
      .get('/ssh-keys')
      .set(authHeaders(adminToken(), 'GET', '/ssh-keys'));
    expect(response.status).toBe(200);
    expect(response.body.data.items).toEqual([]);
    expect(response.body.data.summary.total).toBe(0);
  });

  it('generates Ed25519, returns a safe DTO, and never echoes the private key', async () => {
    const body = { name: 'Production Deploy', algorithm: 'ed25519', comment: 'linuxpilot' };
    const created = await request(app.getHttpServer())
      .post('/ssh-keys/generate')
      .set(authHeaders(adminToken(), 'POST', '/ssh-keys/generate', body))
      .send(body);
    expect(created.status).toBe(201);
    expect(created.body.data.fingerprint).toMatch(/^SHA256:/);
    expect(created.body.data.publicKey).toMatch(/^ssh-ed25519 /);
    expect(created.body.data.encryptedPrivateKey).toBeUndefined();
    expect(created.body.data.privateKey).toBeUndefined();
    expect(JSON.stringify(created.body)).not.toContain('BEGIN PRIVATE KEY');

    const detail = await request(app.getHttpServer())
      .get(`/ssh-keys/${created.body.data.id}`)
      .set(authHeaders(adminToken(), 'GET', `/ssh-keys/${created.body.data.id}`));
    expect(detail.status).toBe(200);
    expect(detail.body.data.privateKeyProtected).toBe(true);
    expect(detail.body.data.encryptedPrivateKey).toBeUndefined();
  });

  it('imports a private key, rejects DSA and duplicates, and blocks viewers from creating', async () => {
    const material = generateSshMaterial({ algorithm: 'ed25519' });
    const importBody = {
      name: 'Staging Access',
      privateKey: material.privateKeyPem,
    };
    const imported = await request(app.getHttpServer())
      .post('/ssh-keys/import')
      .set(authHeaders(adminToken(), 'POST', '/ssh-keys/import', importBody))
      .send(importBody);
    expect(imported.status).toBe(201);
    expect(imported.body.data.fingerprint).toBe(material.fingerprint);

    const duplicate = await request(app.getHttpServer())
      .post('/ssh-keys/import')
      .set(authHeaders(adminToken(), 'POST', '/ssh-keys/import', importBody))
      .send(importBody);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('SSH_KEY_DUPLICATE');
    expect(duplicate.body.error.details[0].existingName).toBe('Staging Access');

    const dsa = await request(app.getHttpServer())
      .post('/ssh-keys/public')
      .set(
        authHeaders(adminToken(), 'POST', '/ssh-keys/public', {
          name: 'DSA',
          publicKey: 'ssh-dss AAAAB3NzaC1kc3MAAACB comment',
        }),
      )
      .send({ name: 'DSA', publicKey: 'ssh-dss AAAAB3NzaC1kc3MAAACB comment' });
    expect(dsa.status).toBe(400);

    const viewer = await request(app.getHttpServer())
      .post('/ssh-keys/generate')
      .set(
        authHeaders(accessToken([PERMISSIONS.SSH_KEYS_READ]), 'POST', '/ssh-keys/generate', {
          name: 'Nope',
        }),
      )
      .send({ name: 'Nope' });
    expect(viewer.status).toBe(403);

    const list = await request(app.getHttpServer())
      .get('/ssh-keys')
      .set(authHeaders(viewerToken(), 'GET', '/ssh-keys'));
    expect(list.status).toBe(403);
  });

  it('assigns a key to a server, blocks deleting an in-use key, then rotates', async () => {
    const first = generateSshMaterial({ algorithm: 'ed25519' });
    const second = generateSshMaterial({ algorithm: 'ed25519' });
    const oldKey = await request(app.getHttpServer())
      .post('/ssh-keys/import')
      .set(
        authHeaders(adminToken(), 'POST', '/ssh-keys/import', {
          name: 'Old',
          privateKey: first.privateKeyPem,
        }),
      )
      .send({ name: 'Old', privateKey: first.privateKeyPem });
    const newKey = await request(app.getHttpServer())
      .post('/ssh-keys/import')
      .set(
        authHeaders(adminToken(), 'POST', '/ssh-keys/import', {
          name: 'New',
          privateKey: second.privateKeyPem,
        }),
      )
      .send({ name: 'New', privateKey: second.privateKeyPem });

    const serverBody = { name: `ssh-host-${Date.now()}` };
    const server = await request(app.getHttpServer())
      .post('/servers')
      .set(authHeaders(adminToken(), 'POST', '/servers', serverBody))
      .send(serverBody);
    expect(server.status).toBe(201);

    const install = await request(app.getHttpServer())
      .post(`/ssh-keys/${oldKey.body.data.id}/install`)
      .set(
        authHeaders(adminToken(), 'POST', `/ssh-keys/${oldKey.body.data.id}/install`, {
          serverIds: [server.body.data.id],
          sshUser: 'linuxpilot',
        }),
      )
      .send({ serverIds: [server.body.data.id], sshUser: 'linuxpilot' });
    expect(install.status).toBe(200);
    expect(install.body.data.results[0].status).toBe('assigned');

    const blocked = await request(app.getHttpServer())
      .delete(`/ssh-keys/${oldKey.body.data.id}`)
      .set(authHeaders(adminToken(), 'DELETE', `/ssh-keys/${oldKey.body.data.id}`));
    expect(blocked.status).toBe(409);

    const rotated = await request(app.getHttpServer())
      .post(`/ssh-keys/${oldKey.body.data.id}/rotate`)
      .set(
        authHeaders(adminToken(), 'POST', `/ssh-keys/${oldKey.body.data.id}/rotate`, {
          replacementKeyId: newKey.body.data.id,
          serverIds: [server.body.data.id],
        }),
      )
      .send({
        replacementKeyId: newKey.body.data.id,
        serverIds: [server.body.data.id],
      });
    expect(rotated.status).toBe(200);
    expect(rotated.body.data.results[0].status).toBe('rotated');
  });
});
