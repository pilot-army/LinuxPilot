import {
  agentAuthHeaderRecord,
  generateAgentKeyPair,
  signAgentRequest,
} from '../packages/common/dist/agent-auth.js';

const gateway = process.env.PUBLIC_GATEWAY_URL ?? 'http://127.0.0.1:3000';
const origin = process.env.FRONTEND_ORIGIN ?? 'http://127.0.0.1:4173';
const email = process.env.E2E_EMAIL ?? 'e2e-admin@example.com';
const password = process.env.E2E_PASSWORD ?? 'CorrectHorse-Battery9';

function parseCookies(setCookieHeaders) {
  const jar = new Map();
  for (const header of setCookieHeaders) {
    const pair = header.split(';', 1)[0];
    const eq = pair.indexOf('=');
    if (eq > 0) {
      jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  }
  return jar;
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function request(path, { method = 'GET', body, jar, extraHeaders = {} } = {}) {
  const headers = {
    origin,
    ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    ...extraHeaders,
  };
  if (jar?.size) {
    headers.cookie = cookieHeader(jar);
    const csrf = jar.get('lp_csrf_token');
    if (csrf && method !== 'GET') {
      headers['x-csrf-token'] = decodeURIComponent(csrf);
    }
  }
  const response = await fetch(`${gateway}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.getSetCookie?.() ?? [];
  if (jar && setCookie.length > 0) {
    for (const [name, value] of parseCookies(setCookie)) {
      jar.set(name, value);
    }
  }
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

const heartbeat = {
  hostname: 'smoke-01',
  osName: 'Debian GNU/Linux',
  osVersion: '12',
  kernelVersion: '6.1.0',
  architecture: 'x86_64',
  agentVersion: '0.1.0',
  cpuUsagePercent: 11,
  load1: 0.2,
  load5: 0.2,
  load15: 0.1,
  memoryUsedBytes: 1_000_000_000,
  memoryTotalBytes: 4_000_000_000,
  swapUsedBytes: 0,
  swapTotalBytes: 0,
  uptimeSeconds: 120,
  processCount: 80,
  disks: [
    {
      mountPoint: '/',
      filesystem: 'ext4',
      usedBytes: 10_000_000_000,
      totalBytes: 50_000_000_000,
      usedPercent: 20,
    },
  ],
};

const jar = new Map();
const login = await request('/api/v1/auth/login', {
  method: 'POST',
  body: { emailOrUsername: email, password },
  jar,
});
if (login.response.status !== 200) {
  throw new Error(`login failed: ${login.response.status} ${JSON.stringify(login.json)}`);
}

const created = await request('/api/v1/servers', {
  method: 'POST',
  body: { name: `smoke-${Date.now()}`, description: 'enrollment smoke', tags: ['smoke'] },
  jar,
});
if (created.response.status !== 201 && created.response.status !== 200) {
  throw new Error(`create failed: ${created.response.status} ${JSON.stringify(created.json)}`);
}
const server = created.json.data;
if (server.status !== 'PENDING') {
  throw new Error(`expected PENDING, got ${server.status}`);
}

const issued = await request(`/api/v1/servers/${server.id}/enrollment-token`, {
  method: 'POST',
  jar,
});
const token = issued.json.data?.token;
if (!token) {
  throw new Error(`token missing: ${JSON.stringify(issued.json)}`);
}

const keys = generateAgentKeyPair();
const enrollBody = {
  serverId: server.id,
  enrollmentToken: token,
  publicKey: keys.publicKeyPem,
  agentVersion: '0.1.0',
};
const enrolled = await request('/api/v1/agent/enroll', { method: 'POST', body: enrollBody });
if (enrolled.response.status !== 200) {
  throw new Error(`enroll failed: ${enrolled.response.status} ${JSON.stringify(enrolled.json)}`);
}
const credentialId = enrolled.json.data.credentialId;

const signed = signAgentRequest(
  keys.privateKeyPem,
  credentialId,
  'POST',
  '/api/v1/agent/heartbeat',
  JSON.stringify(heartbeat),
);
const beat = await request('/api/v1/agent/heartbeat', {
  method: 'POST',
  body: heartbeat,
  extraHeaders: agentAuthHeaderRecord(signed),
});
if (beat.response.status !== 200 || beat.json.data.status !== 'ONLINE') {
  throw new Error(`heartbeat failed: ${beat.response.status} ${JSON.stringify(beat.json)}`);
}

const detail = await request(`/api/v1/servers/${server.id}`, { jar });
if (detail.json.data.status !== 'ONLINE') {
  throw new Error(`expected ONLINE after heartbeat, got ${detail.json.data.status}`);
}

const revoked = await request(`/api/v1/servers/${server.id}/revoke`, { method: 'POST', jar });
if (revoked.response.status !== 200) {
  throw new Error(`revoke failed: ${revoked.response.status} ${JSON.stringify(revoked.json)}`);
}

const afterRevoke = signAgentRequest(
  keys.privateKeyPem,
  credentialId,
  'POST',
  '/api/v1/agent/heartbeat',
  JSON.stringify(heartbeat),
);
const blocked = await request('/api/v1/agent/heartbeat', {
  method: 'POST',
  body: heartbeat,
  extraHeaders: agentAuthHeaderRecord(afterRevoke),
});
if (blocked.response.status !== 401) {
  throw new Error(`revoked agent should be 401, got ${blocked.response.status}`);
}

console.log(
  JSON.stringify({
    ok: true,
    serverId: server.id,
    flow: 'enroll -> heartbeat ONLINE -> revoke -> heartbeat 401',
  }),
);
