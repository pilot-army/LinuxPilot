import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { execFileSync } from 'node:child_process';
import { HEADER_NAMES } from '@linuxpilot/common';
import {
  agentAuthHeaderRecord,
  generateAgentKeyPair,
  signAgentRequest,
} from '@linuxpilot/common/agent-auth';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { CleanupService } from '../src/modules/cleanup/cleanup.service';
import { ServersService } from '../src/modules/servers/servers.service';
import { adminToken, authHeaders, sampleHeartbeat, signedHeaders, viewerToken } from './helpers';

describe('Server Service e2e', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let servers: ServersService;
  let cleanup: CleanupService;

  beforeAll(async () => {
    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: __dirname + '/..',
      env: process.env,
      stdio: 'inherit',
    });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ rawBody: true });
    app.useBodyParser('json', { limit: '32kb' });
    const { requestIdMiddleware } = await import('../src/common/middleware/request-id.middleware');
    app.use(requestIdMiddleware);
    await app.init();
    prisma = app.get(PrismaService);
    servers = app.get(ServersService);
    cleanup = app.get(CleanupService);
    await prisma.serverOperation.deleteMany();
    await prisma.serverEvent.deleteMany();
    await prisma.serverUpdateStatus.deleteMany();
    await prisma.serverMetric.deleteMany();
    await prisma.enrollmentToken.deleteMany();
    await prisma.agentNonce.deleteMany();
    await prisma.agentCredential.deleteMany();
    await prisma.serverAuditLog.deleteMany();
    await prisma.server.deleteMany();
    await prisma.sshKeyActivity.deleteMany();
    await prisma.sshKeyUsage.deleteMany();
    await prisma.sshKey.deleteMany();
    await prisma.serverSpace.deleteMany();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  async function createServer(token = adminToken()) {
    const body = { name: `host-${Date.now()}`, description: 'test', tags: ['edge'] };
    const response = await request(app.getHttpServer())
      .post('/servers')
      .set(authHeaders(token, 'POST', '/servers', body))
      .send(body);
    expect(response.status).toBe(201);
    return response.body.data;
  }

  it('admin creates a server and viewer cannot', async () => {
    const created = await createServer();
    expect(created.status).toBe('PENDING');
    expect(created.credentialId).toBeNull();
    expect(created.autoDetectSystem).toBe(true);
    expect(created.osName).toBeNull();
    expect(created.architecture).toBeNull();
    expect(created.systemInfoStatus).toBe('pending');

    const body = { name: 'denied' };
    const denied = await request(app.getHttpServer())
      .post('/servers')
      .set(authHeaders(viewerToken(), 'POST', '/servers', body))
      .send(body);
    expect(denied.status).toBe(403);
  });

  it('stores manual system fields when auto-detect is disabled', async () => {
    const body = {
      name: `manual-${Date.now()}`,
      autoDetectSystem: false,
      osName: 'debian',
      architecture: 'arm64',
    };
    const response = await request(app.getHttpServer())
      .post('/servers')
      .set(authHeaders(adminToken(), 'POST', '/servers', body))
      .send(body);
    expect(response.status).toBe(201);
    expect(response.body.data.autoDetectSystem).toBe(false);
    expect(response.body.data.osName).toBe('debian');
    expect(response.body.data.architecture).toBe('arm64');
    expect(response.body.data.osVersion).toBeNull();
    expect(response.body.data.systemInfoStatus).toBe('detected');
  });

  it('viewer can list servers and read metrics', async () => {
    const created = await createServer();
    const list = await request(app.getHttpServer())
      .get('/servers?page=1&pageSize=20')
      .set(authHeaders(viewerToken(), 'GET', '/servers?page=1&pageSize=20'));
    expect(list.status).toBe(200);
    expect(list.body.data.items.some((item: { id: string }) => item.id === created.id)).toBe(true);

    const metrics = await request(app.getHttpServer())
      .get(`/servers/${created.id}/metrics`)
      .set(authHeaders(viewerToken(), 'GET', `/servers/${created.id}/metrics`));
    expect(metrics.status).toBe(200);
    expect(metrics.body.data.items).toEqual([]);
  });

  it('enrollment token is shown once and stored only as a hash', async () => {
    const created = await createServer();
    const path = `/servers/${created.id}/enrollment-token`;
    const first = await request(app.getHttpServer())
      .post(path)
      .set(authHeaders(adminToken(), 'POST', path))
      .send();
    expect(first.status).toBe(200);
    expect(first.body.data.token).toMatch(/^[A-Za-z0-9_-]{20,}$/);

    const stored = await prisma.enrollmentToken.findMany({ where: { serverId: created.id } });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.tokenHash).not.toEqual(first.body.data.token);
    expect(JSON.stringify(stored)).not.toContain(first.body.data.token);

    const details = await request(app.getHttpServer())
      .get(`/servers/${created.id}`)
      .set(authHeaders(adminToken(), 'GET', `/servers/${created.id}`));
    expect(JSON.stringify(details.body)).not.toContain(first.body.data.token);
  });

  it('revokes the unused enrollment token when a new one is issued', async () => {
    const created = await createServer();
    const path = `/servers/${created.id}/enrollment-token`;
    const first = await request(app.getHttpServer())
      .post(path)
      .set(authHeaders(adminToken(), 'POST', path))
      .send();
    const firstToken = first.body.data.token as string;
    const second = await request(app.getHttpServer())
      .post(path)
      .set(authHeaders(adminToken(), 'POST', path))
      .send();
    const secondToken = second.body.data.token as string;
    expect(secondToken).not.toEqual(firstToken);

    const stored = await prisma.enrollmentToken.findMany({
      where: { serverId: created.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(stored).toHaveLength(2);
    expect(stored[0]?.revokedAt).toBeTruthy();
    expect(stored[1]?.revokedAt).toBeNull();

    const keys = generateAgentKeyPair();
    const reused = {
      serverId: created.id,
      enrollmentToken: firstToken,
      publicKey: keys.publicKeyPem,
      agentVersion: '0.1.0',
    };
    const rejected = await request(app.getHttpServer())
      .post('/api/v1/agent/enroll')
      .set(signedHeaders('POST', '/api/v1/agent/enroll', reused))
      .send(reused);
    expect(rejected.status).toBe(401);

    const accepted = await request(app.getHttpServer())
      .post('/api/v1/agent/enroll')
      .set(
        signedHeaders('POST', '/api/v1/agent/enroll', { ...reused, enrollmentToken: secondToken }),
      )
      .send({ ...reused, enrollmentToken: secondToken });
    expect(accepted.status).toBe(200);
  });

  it('rejects expired and reused enrollment tokens', async () => {
    const created = await createServer();
    const path = `/servers/${created.id}/enrollment-token`;
    const issued = await request(app.getHttpServer())
      .post(path)
      .set(authHeaders(adminToken(), 'POST', path))
      .send();
    const token = issued.body.data.token as string;
    await prisma.enrollmentToken.updateMany({
      where: { serverId: created.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const keys = generateAgentKeyPair();
    const enrollBody = {
      serverId: created.id,
      enrollmentToken: token,
      publicKey: keys.publicKeyPem,
      agentVersion: '0.1.0',
    };
    const expired = await request(app.getHttpServer())
      .post('/api/v1/agent/enroll')
      .set(signedHeaders('POST', '/api/v1/agent/enroll', enrollBody))
      .send(enrollBody);
    expect(expired.status).toBe(401);

    await prisma.enrollmentToken.updateMany({
      where: { serverId: created.id },
      data: { expiresAt: new Date(Date.now() + 60_000), usedAt: null },
    });
    const first = await request(app.getHttpServer())
      .post('/api/v1/agent/enroll')
      .set(signedHeaders('POST', '/api/v1/agent/enroll', enrollBody))
      .send(enrollBody);
    expect(first.status).toBe(200);
    const reuse = await request(app.getHttpServer())
      .post('/api/v1/agent/enroll')
      .set(signedHeaders('POST', '/api/v1/agent/enroll', enrollBody))
      .send(enrollBody);
    expect(reuse.status).toBe(401);
  });

  it('allows only one of two concurrent enrollments', async () => {
    const created = await createServer();
    const path = `/servers/${created.id}/enrollment-token`;
    const issued = await request(app.getHttpServer())
      .post(path)
      .set(authHeaders(adminToken(), 'POST', path))
      .send();
    const token = issued.body.data.token as string;
    const keysA = generateAgentKeyPair();
    const keysB = generateAgentKeyPair();
    const bodyA = {
      serverId: created.id,
      enrollmentToken: token,
      publicKey: keysA.publicKeyPem,
      agentVersion: '0.1.0',
    };
    const bodyB = { ...bodyA, publicKey: keysB.publicKeyPem };
    const [one, two] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/agent/enroll')
        .set(signedHeaders('POST', '/api/v1/agent/enroll', bodyA))
        .send(bodyA),
      request(app.getHttpServer())
        .post('/api/v1/agent/enroll')
        .set(signedHeaders('POST', '/api/v1/agent/enroll', bodyB))
        .send(bodyB),
    ]);
    const statuses = [one.status, two.status].sort();
    expect(statuses).toEqual([200, 401]);
  });

  it('accepts a valid heartbeat and rejects bad signatures, mutated fields, replay, and stale timestamps', async () => {
    const created = await createServer();
    const path = `/servers/${created.id}/enrollment-token`;
    const issued = await request(app.getHttpServer())
      .post(path)
      .set(authHeaders(adminToken(), 'POST', path))
      .send();
    const keys = generateAgentKeyPair();
    const enrollBody = {
      serverId: created.id,
      enrollmentToken: issued.body.data.token,
      publicKey: keys.publicKeyPem,
      agentVersion: '0.1.0',
    };
    const enrolled = await request(app.getHttpServer())
      .post('/api/v1/agent/enroll')
      .set(signedHeaders('POST', '/api/v1/agent/enroll', enrollBody))
      .send(enrollBody);
    const credentialId = enrolled.body.data.credentialId as string;
    const heartbeat = sampleHeartbeat();
    const serialized = JSON.stringify(heartbeat);
    const signed = signAgentRequest(
      keys.privateKeyPem,
      credentialId,
      'POST',
      '/api/v1/agent/heartbeat',
      serialized,
    );
    const ok = await request(app.getHttpServer())
      .post('/api/v1/agent/heartbeat')
      .set(signedHeaders('POST', '/api/v1/agent/heartbeat', heartbeat))
      .set(agentAuthHeaderRecord(signed))
      .send(heartbeat);
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe('ONLINE');
    const afterHeartbeat = await request(app.getHttpServer())
      .get(`/servers/${created.id}`)
      .set(authHeaders(adminToken(), 'GET', `/servers/${created.id}`));
    expect(afterHeartbeat.body.data.architecture).toBe('amd64');
    expect(afterHeartbeat.body.data.osName).toBe('Debian GNU/Linux');
    expect(afterHeartbeat.body.data.systemInfoStatus).toBe('detected');

    const badSig = await request(app.getHttpServer())
      .post('/api/v1/agent/heartbeat')
      .set(signedHeaders('POST', '/api/v1/agent/heartbeat', heartbeat))
      .set({
        ...agentAuthHeaderRecord(signed),
        [HEADER_NAMES.agentSignature]: Buffer.from('x'.repeat(64)).toString('base64'),
      })
      .send(heartbeat);
    expect(badSig.status).toBe(401);

    const mutated = { ...heartbeat, cpuUsagePercent: 99 };
    const mutatedReq = await request(app.getHttpServer())
      .post('/api/v1/agent/heartbeat')
      .set(signedHeaders('POST', '/api/v1/agent/heartbeat', mutated))
      .set(agentAuthHeaderRecord(signed))
      .send(mutated);
    expect(mutatedReq.status).toBe(401);

    const replay = await request(app.getHttpServer())
      .post('/api/v1/agent/heartbeat')
      .set(signedHeaders('POST', '/api/v1/agent/heartbeat', heartbeat))
      .set(agentAuthHeaderRecord(signed))
      .send(heartbeat);
    expect(replay.status).toBe(401);

    const stale = signAgentRequest(
      keys.privateKeyPem,
      credentialId,
      'POST',
      '/api/v1/agent/heartbeat',
      serialized,
      Date.now() - 120_000,
    );
    const staleReq = await request(app.getHttpServer())
      .post('/api/v1/agent/heartbeat')
      .set(signedHeaders('POST', '/api/v1/agent/heartbeat', heartbeat))
      .set(agentAuthHeaderRecord(stale))
      .send(heartbeat);
    expect(staleReq.status).toBe(401);
  });

  it('stores unknown system info when the agent reports an unsupported architecture', async () => {
    const created = await createServer();
    const path = `/servers/${created.id}/enrollment-token`;
    const issued = await request(app.getHttpServer())
      .post(path)
      .set(authHeaders(adminToken(), 'POST', path))
      .send();
    const keys = generateAgentKeyPair();
    const enrollBody = {
      serverId: created.id,
      enrollmentToken: issued.body.data.token,
      publicKey: keys.publicKeyPem,
      agentVersion: '0.1.0',
    };
    const enrolled = await request(app.getHttpServer())
      .post('/api/v1/agent/enroll')
      .set(signedHeaders('POST', '/api/v1/agent/enroll', enrollBody))
      .send(enrollBody);
    const credentialId = enrolled.body.data.credentialId as string;
    const heartbeat = sampleHeartbeat({ architecture: 'ppc64', osName: 'unknown' });
    const signed = signAgentRequest(
      keys.privateKeyPem,
      credentialId,
      'POST',
      '/api/v1/agent/heartbeat',
      JSON.stringify(heartbeat),
    );
    const ok = await request(app.getHttpServer())
      .post('/api/v1/agent/heartbeat')
      .set(signedHeaders('POST', '/api/v1/agent/heartbeat', heartbeat))
      .set(agentAuthHeaderRecord(signed))
      .send(heartbeat);
    expect(ok.status).toBe(200);
    const details = await request(app.getHttpServer())
      .get(`/servers/${created.id}`)
      .set(authHeaders(adminToken(), 'GET', `/servers/${created.id}`));
    expect(details.body.data.architecture).toBe('unknown');
    expect(details.body.data.osName).toBe('unknown');
    expect(details.body.data.systemInfoStatus).toBe('unknown');
  });

  it('rejects another server credential, revoked and rotated credentials, and oversized bodies', async () => {
    const first = await createServer();
    const second = await createServer();
    const tokenPath = `/servers/${first.id}/enrollment-token`;
    const issued = await request(app.getHttpServer())
      .post(tokenPath)
      .set(authHeaders(adminToken(), 'POST', tokenPath))
      .send();
    const keys = generateAgentKeyPair();
    const enrollBody = {
      serverId: second.id,
      enrollmentToken: issued.body.data.token,
      publicKey: keys.publicKeyPem,
      agentVersion: '0.1.0',
    };
    const cross = await request(app.getHttpServer())
      .post('/api/v1/agent/enroll')
      .set(signedHeaders('POST', '/api/v1/agent/enroll', enrollBody))
      .send(enrollBody);
    expect(cross.status).toBe(401);

    const own = {
      serverId: first.id,
      enrollmentToken: issued.body.data.token,
      publicKey: keys.publicKeyPem,
      agentVersion: '0.1.0',
    };
    const enrolled = await request(app.getHttpServer())
      .post('/api/v1/agent/enroll')
      .set(signedHeaders('POST', '/api/v1/agent/enroll', own))
      .send(own);
    const credentialId = enrolled.body.data.credentialId as string;

    const rotatePath = `/servers/${first.id}/rotate-credential`;
    await request(app.getHttpServer())
      .post(rotatePath)
      .set(authHeaders(adminToken(), 'POST', rotatePath))
      .send();
    const heartbeat = sampleHeartbeat();
    const serialized = JSON.stringify(heartbeat);
    const signed = signAgentRequest(
      keys.privateKeyPem,
      credentialId,
      'POST',
      '/api/v1/agent/heartbeat',
      serialized,
    );
    const rotated = await request(app.getHttpServer())
      .post('/api/v1/agent/heartbeat')
      .set(signedHeaders('POST', '/api/v1/agent/heartbeat', heartbeat))
      .set(agentAuthHeaderRecord(signed))
      .send(heartbeat);
    expect(rotated.status).toBe(401);

    const third = await createServer();
    const thirdToken = await request(app.getHttpServer())
      .post(`/servers/${third.id}/enrollment-token`)
      .set(authHeaders(adminToken(), 'POST', `/servers/${third.id}/enrollment-token`))
      .send();
    const thirdKeys = generateAgentKeyPair();
    const thirdEnroll = {
      serverId: third.id,
      enrollmentToken: thirdToken.body.data.token,
      publicKey: thirdKeys.publicKeyPem,
      agentVersion: '0.1.0',
    };
    const thirdEnrolled = await request(app.getHttpServer())
      .post('/api/v1/agent/enroll')
      .set(signedHeaders('POST', '/api/v1/agent/enroll', thirdEnroll))
      .send(thirdEnroll);
    await request(app.getHttpServer())
      .post(`/servers/${third.id}/revoke`)
      .set(authHeaders(adminToken(), 'POST', `/servers/${third.id}/revoke`))
      .send();
    const revokedSigned = signAgentRequest(
      thirdKeys.privateKeyPem,
      thirdEnrolled.body.data.credentialId,
      'POST',
      '/api/v1/agent/heartbeat',
      serialized,
    );
    const revoked = await request(app.getHttpServer())
      .post('/api/v1/agent/heartbeat')
      .set(signedHeaders('POST', '/api/v1/agent/heartbeat', heartbeat))
      .set(agentAuthHeaderRecord(revokedSigned))
      .send(heartbeat);
    expect(revoked.status).toBe(401);

    const huge = { padding: 'x'.repeat(40_000) };
    const oversized = await request(app.getHttpServer())
      .post('/api/v1/agent/enroll')
      .set(signedHeaders('POST', '/api/v1/agent/enroll', huge))
      .send(huge);
    expect(oversized.status).toBeGreaterThanOrEqual(400);
  });

  it('stores metrics, pages results, and keeps secrets out of the audit log', async () => {
    const created = await createServer();
    const issued = await request(app.getHttpServer())
      .post(`/servers/${created.id}/enrollment-token`)
      .set(authHeaders(adminToken(), 'POST', `/servers/${created.id}/enrollment-token`))
      .send();
    const token = issued.body.data.token as string;
    const keys = generateAgentKeyPair();
    const enrollBody = {
      serverId: created.id,
      enrollmentToken: token,
      publicKey: keys.publicKeyPem,
      agentVersion: '0.1.0',
    };
    const enrolled = await request(app.getHttpServer())
      .post('/api/v1/agent/enroll')
      .set(signedHeaders('POST', '/api/v1/agent/enroll', enrollBody))
      .send(enrollBody);
    const heartbeat = sampleHeartbeat();
    const serialized = JSON.stringify(heartbeat);
    const signed = signAgentRequest(
      keys.privateKeyPem,
      enrolled.body.data.credentialId,
      'POST',
      '/api/v1/agent/heartbeat',
      serialized,
    );
    await request(app.getHttpServer())
      .post('/api/v1/agent/heartbeat')
      .set(signedHeaders('POST', '/api/v1/agent/heartbeat', heartbeat))
      .set(agentAuthHeaderRecord(signed))
      .send(heartbeat);

    const metrics = await request(app.getHttpServer())
      .get(`/servers/${created.id}/metrics`)
      .set(authHeaders(adminToken(), 'GET', `/servers/${created.id}/metrics`));
    expect(metrics.body.data.items).toHaveLength(1);
    expect(metrics.body.data.items[0].cpuUsagePercent).toBe(12.5);

    const page = await request(app.getHttpServer())
      .get('/servers?page=1&pageSize=1&sort=createdAt&order=desc')
      .set(
        authHeaders(adminToken(), 'GET', '/servers?page=1&pageSize=1&sort=createdAt&order=desc'),
      );
    expect(page.status).toBe(200);
    expect(page.body.data.pageSize).toBe(1);
    expect(page.body.data.items).toHaveLength(1);

    const tooBig = await request(app.getHttpServer())
      .get('/servers?page=1&pageSize=500')
      .set(authHeaders(adminToken(), 'GET', '/servers?page=1&pageSize=500'));
    expect(tooBig.status).toBe(400);

    const audit = await request(app.getHttpServer())
      .get(`/servers/${created.id}/audit`)
      .set(authHeaders(adminToken(), 'GET', `/servers/${created.id}/audit`));
    const serializedAudit = JSON.stringify(audit.body);
    expect(serializedAudit).not.toContain(token);
    expect(serializedAudit).not.toMatch(/BEGIN PRIVATE KEY|x-lp-agent-signature|lp_access_token/);
  });

  it('marks a server offline after timeout and online after a new heartbeat', async () => {
    const created = await createServer();
    const issued = await request(app.getHttpServer())
      .post(`/servers/${created.id}/enrollment-token`)
      .set(authHeaders(adminToken(), 'POST', `/servers/${created.id}/enrollment-token`))
      .send();
    const keys = generateAgentKeyPair();
    const enrollBody = {
      serverId: created.id,
      enrollmentToken: issued.body.data.token,
      publicKey: keys.publicKeyPem,
      agentVersion: '0.1.0',
    };
    const enrolled = await request(app.getHttpServer())
      .post('/api/v1/agent/enroll')
      .set(signedHeaders('POST', '/api/v1/agent/enroll', enrollBody))
      .send(enrollBody);
    const heartbeat = sampleHeartbeat();
    const signed = signAgentRequest(
      keys.privateKeyPem,
      enrolled.body.data.credentialId,
      'POST',
      '/api/v1/agent/heartbeat',
      JSON.stringify(heartbeat),
    );
    await request(app.getHttpServer())
      .post('/api/v1/agent/heartbeat')
      .set(signedHeaders('POST', '/api/v1/agent/heartbeat', heartbeat))
      .set(agentAuthHeaderRecord(signed))
      .send(heartbeat);

    await prisma.server.update({
      where: { id: created.id },
      data: { lastSeenAt: new Date(Date.now() - 120_000) },
    });
    const marked = await servers.markOfflineBatch();
    expect(marked).toBeGreaterThanOrEqual(1);
    const offline = await request(app.getHttpServer())
      .get(`/servers/${created.id}`)
      .set(authHeaders(adminToken(), 'GET', `/servers/${created.id}`));
    expect(offline.body.data.status).toBe('OFFLINE');

    const next = sampleHeartbeat({ cpuUsagePercent: 8 });
    const nextSigned = signAgentRequest(
      keys.privateKeyPem,
      enrolled.body.data.credentialId,
      'POST',
      '/api/v1/agent/heartbeat',
      JSON.stringify(next),
    );
    const back = await request(app.getHttpServer())
      .post('/api/v1/agent/heartbeat')
      .set(signedHeaders('POST', '/api/v1/agent/heartbeat', next))
      .set(agentAuthHeaderRecord(nextSigned))
      .send(next);
    expect(back.body.data.status).toBe('ONLINE');
  });

  it('cleans old metrics in batches and exposes ready/health', async () => {
    const created = await createServer();
    await prisma.serverMetric.create({
      data: {
        serverId: created.id,
        timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        disks: [],
        incomplete: false,
      },
    });
    const removed = await cleanup.runCleanup();
    expect(removed.metrics).toBeGreaterThanOrEqual(1);

    const health = await request(app.getHttpServer()).get('/health');
    expect(health.status).toBe(200);
    expect(health.body.data.service).toBe('server-service');
    const ready = await request(app.getHttpServer()).get('/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.data.checks.database).toBe('ok');
  });
});
