import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { execFileSync } from 'node:child_process';
import {
  agentAuthHeaderRecord,
  generateAgentKeyPair,
  signAgentRequest,
} from '@linuxpilot/common/agent-auth';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { adminToken, authHeaders, sampleHeartbeat, signedHeaders, viewerToken } from './helpers';

describe('Server modules e2e', () => {
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
    app.useBodyParser('json', { limit: '32kb' });
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

  async function createServer(name = `host-${Date.now()}`) {
    const body = { name, description: 'test', tags: ['edge'] };
    const response = await request(app.getHttpServer())
      .post('/servers')
      .set(authHeaders(adminToken(), 'POST', '/servers', body))
      .send(body);
    expect(response.status).toBe(201);
    return response.body.data;
  }

  it('creates groups, assigns them, and unassigns on delete', async () => {
    const created = await createServer();
    const groupBody = { name: `prod-${Date.now()}`, description: 'Prod', color: '#22c55e' };
    const group = await request(app.getHttpServer())
      .post('/server-groups')
      .set(authHeaders(adminToken(), 'POST', '/server-groups', groupBody))
      .send(groupBody);
    expect(group.status).toBe(201);
    expect(group.body.data.withoutAgentCount).toBe(0);
    expect(group.body.data.averageCpuPercent).toBeNull();
    const fetched = await request(app.getHttpServer())
      .get(`/server-groups/${group.body.data.id}`)
      .set(authHeaders(adminToken(), 'GET', `/server-groups/${group.body.data.id}`));
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.id).toBe(group.body.data.id);
    const assign = { groupId: group.body.data.id };
    const assigned = await request(app.getHttpServer())
      .post(`/servers/${created.id}/group`)
      .set(authHeaders(adminToken(), 'POST', `/servers/${created.id}/group`, assign))
      .send(assign);
    expect(assigned.status).toBe(200);
    expect(assigned.body.data.groupId).toBe(group.body.data.id);

    const listed = await request(app.getHttpServer())
      .get('/servers?groupId=' + group.body.data.id)
      .set(authHeaders(adminToken(), 'GET', '/servers?groupId=' + group.body.data.id));
    expect(listed.body.data.items.some((item: { id: string }) => item.id === created.id)).toBe(
      true,
    );

    await request(app.getHttpServer())
      .delete(`/server-groups/${group.body.data.id}`)
      .set(authHeaders(adminToken(), 'DELETE', `/server-groups/${group.body.data.id}`))
      .send();
    const after = await request(app.getHttpServer())
      .get(`/servers/${created.id}`)
      .set(authHeaders(adminToken(), 'GET', `/servers/${created.id}`));
    expect(after.body.data.groupId).toBeNull();
  });

  it('normalizes tags and lists the catalog', async () => {
    const created = await createServer();
    const body = { tags: ['Web', 'web', 'api'] };
    const tagged = await request(app.getHttpServer())
      .post(`/servers/${created.id}/tags`)
      .set(authHeaders(adminToken(), 'POST', `/servers/${created.id}/tags`, body))
      .send(body);
    expect(tagged.body.data.tags).toEqual(expect.arrayContaining(['web', 'api']));
    const catalog = await request(app.getHttpServer())
      .get('/server-tags')
      .set(authHeaders(viewerToken(), 'GET', '/server-tags'));
    expect(catalog.body.data.items).toEqual(expect.arrayContaining(['web', 'api', 'edge']));
  });

  it('records events and computes health without inventing metrics', async () => {
    const created = await createServer();
    const events = await request(app.getHttpServer())
      .get(`/servers/${created.id}/events`)
      .set(authHeaders(adminToken(), 'GET', `/servers/${created.id}/events`));
    expect(
      events.body.data.items.some((item: { type: string }) => item.type === 'SERVER_CREATED'),
    ).toBe(true);
    const health = await request(app.getHttpServer())
      .get(`/servers/${created.id}/health`)
      .set(authHeaders(adminToken(), 'GET', `/servers/${created.id}/health`));
    expect(
      health.body.data.reasons.some(
        (item: { code: string }) => item.code === 'AGENT_NOT_INSTALLED',
      ),
    ).toBe(true);
    const history = await request(app.getHttpServer())
      .get(`/servers/${created.id}/metrics/history`)
      .set(authHeaders(adminToken(), 'GET', `/servers/${created.id}/metrics/history`));
    expect(history.body.data.items).toEqual([]);
  });

  it('starts maintenance, suppresses offline events, and queues operations', async () => {
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

    const maintenance = { reason: 'kernel upgrade' };
    const started = await request(app.getHttpServer())
      .post(`/servers/${created.id}/maintenance`)
      .set(authHeaders(adminToken(), 'POST', `/servers/${created.id}/maintenance`, maintenance))
      .send(maintenance);
    expect(started.body.data.active).toBe(true);

    const opBody = { type: 'REFRESH_METRICS', idempotencyKey: `idem-${created.id}` };
    const first = await request(app.getHttpServer())
      .post(`/servers/${created.id}/operations`)
      .set(authHeaders(adminToken(), 'POST', `/servers/${created.id}/operations`, opBody))
      .send(opBody);
    const second = await request(app.getHttpServer())
      .post(`/servers/${created.id}/operations`)
      .set(authHeaders(adminToken(), 'POST', `/servers/${created.id}/operations`, opBody))
      .send(opBody);
    expect(first.body.data.id).toBe(second.body.data.id);

    const nextPath = '/api/v1/agent/operations/next';
    const nextSigned = signAgentRequest(
      keys.privateKeyPem,
      enrolled.body.data.credentialId,
      'GET',
      nextPath,
      '',
    );
    const next = await request(app.getHttpServer())
      .get(nextPath)
      .set(signedHeaders('GET', nextPath))
      .set(agentAuthHeaderRecord(nextSigned));
    expect(next.status).toBe(200);
    expect(next.body.data.type).toBe('REFRESH_METRICS');

    const resultBody = { success: true, result: { ok: true } };
    const resultPath = `/api/v1/agent/operations/${first.body.data.id}/result`;
    const resultSigned = signAgentRequest(
      keys.privateKeyPem,
      enrolled.body.data.credentialId,
      'POST',
      resultPath,
      JSON.stringify(resultBody),
    );
    const done = await request(app.getHttpServer())
      .post(resultPath)
      .set(signedHeaders('POST', resultPath, resultBody))
      .set(agentAuthHeaderRecord(resultSigned))
      .send(resultBody);
    expect(done.body.data.status).toBe('SUCCEEDED');

    const replay = await request(app.getHttpServer())
      .post(resultPath)
      .set(signedHeaders('POST', resultPath, resultBody))
      .set(agentAuthHeaderRecord(resultSigned))
      .send(resultBody);
    expect(replay.status).toBe(401);
  });

  it('rejects viewer writes and keeps tenant-less isolation by missing ids', async () => {
    const body = { name: 'nope' };
    const denied = await request(app.getHttpServer())
      .post('/server-groups')
      .set(authHeaders(viewerToken(), 'POST', '/server-groups', body))
      .send(body);
    expect(denied.status).toBe(403);
    const missing = await request(app.getHttpServer())
      .get('/servers/00000000-0000-4000-8000-000000000000')
      .set(authHeaders(adminToken(), 'GET', '/servers/00000000-0000-4000-8000-000000000000'));
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('SERVER_NOT_FOUND');
  });
});
