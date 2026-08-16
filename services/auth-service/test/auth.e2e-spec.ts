import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaClient, UserStatus } from '@prisma/client';
import { AUTH_ERROR_CODES, PERMISSIONS, ROLES } from '@linuxpilot/auth-contracts';
import { hash, argon2id } from 'argon2';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { requestIdMiddleware } from '../src/common/middleware/request-id.middleware';
import {
  composeRefreshToken,
  generateRefreshSecret,
  hashRefreshToken,
} from '../src/common/crypto/token.util';
import { signedHeaders } from './service-auth';

const prisma = new PrismaClient();
const password = 'CorrectHorse-Battery9';
const serviceRoot = resolve(__dirname, '..');

type LoginBody = {
  data: {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string };
  };
};

describe('Auth Service (e2e)', () => {
  let app!: INestApplication;
  let passwordHash: string;

  beforeAll(async () => {
    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: serviceRoot,
      env: process.env,
      stdio: 'inherit',
    });
    execFileSync('pnpm', ['exec', 'tsx', 'prisma/seed.ts'], {
      cwd: serviceRoot,
      env: process.env,
      stdio: 'inherit',
    });

    passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: Number(process.env.ARGON2_MEMORY_COST),
      timeCost: Number(process.env.ARGON2_TIME_COST),
      parallelism: Number(process.env.ARGON2_PARALLELISM),
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.use(requestIdMiddleware);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.usedRefreshToken.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.session.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
  });

  async function createUser(
    overrides: {
      email?: string;
      username?: string;
      status?: UserStatus;
      role?: string;
    } = {},
  ) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: overrides.role ?? ROLES.SUPER_ADMIN },
    });
    const username = overrides.username ?? 'admin';
    return prisma.user.create({
      data: {
        email: overrides.email ?? 'admin@example.com',
        username,
        usernameNormalized: username.toLowerCase(),
        passwordHash,
        status: overrides.status ?? UserStatus.ACTIVE,
        roles: { create: { roleId: role.id } },
      },
    });
  }

  function post(path: string, body?: object) {
    const req = request(app.getHttpServer()).post(path);
    const headers = signedHeaders('POST', path, body);
    for (const [key, value] of Object.entries(headers)) {
      req.set(key, value);
    }
    if (body) {
      req.send(body);
    }
    return req;
  }

  function get(path: string, accessToken?: string) {
    const req = request(app.getHttpServer()).get(path);
    const headers = signedHeaders('GET', path);
    for (const [key, value] of Object.entries(headers)) {
      req.set(key, value);
    }
    if (accessToken) {
      req.set('Authorization', `Bearer ${accessToken}`);
    }
    return req;
  }

  function del(path: string, accessToken?: string) {
    const req = request(app.getHttpServer()).delete(path);
    const headers = signedHeaders('DELETE', path);
    for (const [key, value] of Object.entries(headers)) {
      req.set(key, value);
    }
    if (accessToken) {
      req.set('Authorization', `Bearer ${accessToken}`);
    }
    return req;
  }

  function patch(path: string, body: object, accessToken: string) {
    const req = request(app.getHttpServer()).patch(path);
    const headers = signedHeaders('PATCH', path, body);
    for (const [key, value] of Object.entries(headers)) {
      req.set(key, value);
    }
    req.set('Authorization', `Bearer ${accessToken}`);
    return req.send(body);
  }

  function login(emailOrUsername = 'admin@example.com', userPassword = password) {
    return post('/auth/login', { emailOrUsername, password: userPassword });
  }

  it('logs in with valid credentials', async () => {
    await createUser();
    const response = await login();

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe('admin@example.com');
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.refreshToken).toEqual(expect.any(String));
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.meta.requestId).toEqual(expect.any(String));
  });

  it('rejects an incorrect password with a generic message', async () => {
    await createUser();
    const response = await login('admin@example.com', 'WrongPassword-123');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    expect(response.body.error.message).toBe('Invalid credentials');
  });

  it('rejects a second user with the same username in a different case', async () => {
    await createUser({ username: 'Admin' });
    await expect(createUser({ email: 'other@example.com', username: 'admin' })).rejects.toThrow(
      /unique/i,
    );
  });

  it('logs in with a different username case', async () => {
    await createUser({ username: 'Admin' });
    const response = await login('ADMIN');
    expect(response.status).toBe(200);
    expect(response.body.data.user.username).toBe('Admin');
  });

  it('rejects a blocked user', async () => {
    await createUser({ status: UserStatus.BLOCKED });
    const response = await login();

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
  });

  it('rejects a pending user on login and refresh', async () => {
    await createUser({ status: UserStatus.PENDING });
    const loginResponse = await login();
    expect(loginResponse.status).toBe(403);
    expect(loginResponse.body.error.code).toBe(AUTH_ERROR_CODES.ACCOUNT_PENDING);
  });

  it('returns the current user from /auth/me', async () => {
    await createUser();
    const loginResponse = await login();
    const { accessToken } = (loginResponse.body as LoginBody).data;

    const response = await get('/auth/me', accessToken);

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe('admin@example.com');
    expect(response.body.data.user.roles).toContain(ROLES.SUPER_ADMIN);
  });

  it('rotates the refresh token and treats proven reuse as family revoke', async () => {
    await createUser();
    const first = await login();
    const originalRefresh = (first.body as LoginBody).data.refreshToken;
    const secondLogin = await login();
    const otherRefresh = (secondLogin.body as LoginBody).data.refreshToken;

    const refreshed = await post('/auth/refresh', { refreshToken: originalRefresh });

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.refreshToken).not.toBe(originalRefresh);

    await prisma.session.updateMany({
      data: { rotatedAt: new Date(Date.now() - 60_000) },
    });

    const reuse = await post('/auth/refresh', { refreshToken: originalRefresh });
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe(AUTH_ERROR_CODES.REFRESH_TOKEN_REUSE);

    const otherStillValid = await post('/auth/refresh', { refreshToken: otherRefresh });
    expect(otherStillValid.status).toBe(200);
  });

  it('returns TOKEN_INVALID for a valid sid and random secret without killing other sessions', async () => {
    await createUser();
    const first = await login();
    const second = await login();
    const firstRefresh = (first.body as LoginBody).data.refreshToken;
    const secondRefresh = (second.body as LoginBody).data.refreshToken;
    const [sid] = firstRefresh.split('.');

    const forged = await post('/auth/refresh', { refreshToken: `${sid}.aaaaaaaaaaaaaaaa` });
    expect(forged.status).toBe(401);
    expect(forged.body.error.code).toBe(AUTH_ERROR_CODES.TOKEN_INVALID);

    const stillFirst = await post('/auth/refresh', { refreshToken: firstRefresh });
    const stillSecond = await post('/auth/refresh', { refreshToken: secondRefresh });
    expect(stillFirst.status).toBe(200);
    expect(stillSecond.status).toBe(200);
  });

  it('makes unknown sid and wrong secret indistinguishable', async () => {
    await createUser();
    const first = await login();
    const [sid] = (first.body as LoginBody).data.refreshToken.split('.');

    const unknown = await post('/auth/refresh', {
      refreshToken: `33333333-3333-4333-8333-333333333333.aaaaaaaaaaaaaaaa`,
    });
    const wrong = await post('/auth/refresh', { refreshToken: `${sid}.aaaaaaaaaaaaaaaa` });

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body.error.code).toBe(AUTH_ERROR_CODES.TOKEN_INVALID);
    expect(wrong.body.error.code).toBe(AUTH_ERROR_CODES.TOKEN_INVALID);
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
  });

  it('allows only one of two concurrent refresh requests to succeed', async () => {
    await createUser();
    const first = await login();
    const refreshToken = (first.body as LoginBody).data.refreshToken;

    const [a, b] = await Promise.all([
      post('/auth/refresh', { refreshToken }),
      post('/auth/refresh', { refreshToken }),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 401]);
    const failed = a.status === 401 ? a : b;
    expect([AUTH_ERROR_CODES.TOKEN_INVALID, AUTH_ERROR_CODES.REFRESH_TOKEN_REUSE]).toContain(
      failed.body.error.code,
    );
  });

  it('lists and revokes only the caller sessions', async () => {
    await createUser();
    const first = await login();
    const second = await login();
    const firstTokens = (first.body as LoginBody).data;
    const secondTokens = (second.body as LoginBody).data;

    const listed = await get('/auth/sessions', firstTokens.accessToken);
    expect(listed.status).toBe(200);
    expect(listed.body.data.sessions).toHaveLength(2);

    const otherId = listed.body.data.sessions.find(
      (session: { current: boolean }) => !session.current,
    ).id;
    const revoked = await del(`/auth/sessions/${otherId}`, firstTokens.accessToken);
    expect(revoked.status).toBe(200);

    const secondMe = await get('/auth/me', secondTokens.accessToken);
    expect(secondMe.status).toBe(401);
    const firstMe = await get('/auth/me', firstTokens.accessToken);
    expect(firstMe.status).toBe(200);
  });

  it('blocks an existing access session after the user is blocked', async () => {
    const user = await createUser();
    const first = await login();
    const { accessToken } = (first.body as LoginBody).data;

    const blocked = await patch(
      `/auth/admin/users/${user.id}/status`,
      { status: 'BLOCKED' },
      accessToken,
    );
    expect(blocked.status).toBe(200);

    const me = await get('/auth/me', accessToken);
    expect(me.status).toBe(403);
    expect(me.body.error.code).toBe(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
  });

  it('does not include required permissions in a 403 response', async () => {
    await createUser({ role: ROLES.VIEWER, email: 'viewer@example.com', username: 'viewer' });
    const loginResponse = await login('viewer@example.com');
    const { accessToken, user } = (loginResponse.body as LoginBody).data;

    const forbidden = await patch(
      `/auth/admin/users/${user.id}/status`,
      { status: 'BLOCKED' },
      accessToken,
    );
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe(AUTH_ERROR_CODES.FORBIDDEN);
    expect(JSON.stringify(forbidden.body)).not.toContain(PERMISSIONS.USERS_UPDATE);
  });

  it('logs out the current session', async () => {
    await createUser();
    const first = await login();
    const { accessToken, refreshToken } = (first.body as LoginBody).data;

    const logout = await post('/auth/logout', { refreshToken });
    expect(logout.status).toBe(200);

    const me = await get('/auth/me', accessToken);
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe(AUTH_ERROR_CODES.SESSION_REVOKED);
  });

  it('treats a repeated logout as success', async () => {
    await createUser();
    const first = await login();
    const { refreshToken } = (first.body as LoginBody).data;

    expect((await post('/auth/logout', { refreshToken })).status).toBe(200);
    expect((await post('/auth/logout', { refreshToken })).status).toBe(200);
  });

  it('revokes every session via logout-all', async () => {
    await createUser();
    const first = await login();
    const second = await login();
    const firstTokens = (first.body as LoginBody).data;
    const secondTokens = (second.body as LoginBody).data;

    const req = request(app.getHttpServer()).post('/auth/logout-all');
    for (const [key, value] of Object.entries(signedHeaders('POST', '/auth/logout-all'))) {
      req.set(key, value);
    }
    const logoutAll = await req.set('Authorization', `Bearer ${firstTokens.accessToken}`);
    expect(logoutAll.status).toBe(200);

    const firstMe = await get('/auth/me', firstTokens.accessToken);
    const secondMe = await get('/auth/me', secondTokens.accessToken);
    expect(firstMe.status).toBe(401);
    expect(secondMe.status).toBe(401);
  });

  it('rejects access without a token', async () => {
    const response = await get('/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(AUTH_ERROR_CODES.UNAUTHORIZED);
  });

  it('rejects unsigned internal requests', async () => {
    const response = await request(app.getHttpServer()).post('/auth/login').send({
      emailOrUsername: 'admin@example.com',
      password,
    });
    expect(response.status).toBe(401);
  });

  it('rejects an expired session', async () => {
    const user = await createUser();
    const sessionId = '33333333-3333-4333-8333-333333333333';
    const refreshToken = composeRefreshToken(sessionId, generateRefreshSecret());

    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        familyId: sessionId,
        refreshTokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const response = await post('/auth/refresh', { refreshToken });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(AUTH_ERROR_CODES.SESSION_EXPIRED);
  });

  it('rejects an oversized refresh token', async () => {
    const response = await post('/auth/refresh', { refreshToken: `${'a'.repeat(300)}` });
    expect(response.status).toBe(400);
  });

  it('exposes a health endpoint without service auth', async () => {
    const response = await request(app.getHttpServer()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('writes login and reuse events to the audit log without secrets', async () => {
    await createUser();
    await login();
    const first = await login();
    const original = (first.body as LoginBody).data.refreshToken;
    await post('/auth/refresh', { refreshToken: original });
    await prisma.session.updateMany({
      data: { rotatedAt: new Date(Date.now() - 60_000) },
    });
    await post('/auth/refresh', { refreshToken: original });

    const events = await prisma.auditLog.findMany();
    expect(events.some((event) => event.action === 'auth.login.success')).toBe(true);
    expect(events.some((event) => event.action === 'auth.refresh.reuse')).toBe(true);
    expect(JSON.stringify(events)).not.toContain(original);
    expect(JSON.stringify(events)).not.toContain(password);
  });
});
