export const gatewayOpenApi = {
  openapi: '3.1.0',
  info: {
    title: 'LinuxPilot Gateway API',
    version: '0.1.0',
    description:
      'Public browser-facing API. Internal service credentials and JWT private keys are not part of this contract.',
  },
  servers: [{ url: '/' }],
  paths: {
    '/health': {
      get: {
        summary: 'Liveness',
        responses: { '200': { description: 'Service is up' } },
      },
    },
    '/api/v1/auth/login': {
      post: {
        summary: 'Sign in',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['emailOrUsername', 'password'],
                properties: {
                  emailOrUsername: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Sets HttpOnly cookies and returns the public user' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        summary: 'Rotate refresh token',
        responses: { '200': { description: 'New cookies' } },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        summary: 'Revoke the current session',
        responses: { '200': { description: 'Cookies cleared' } },
      },
    },
    '/api/v1/auth/logout-all': {
      post: {
        summary: 'Revoke every session',
        responses: { '200': { description: 'Cookies cleared' } },
      },
    },
    '/api/v1/auth/me': {
      get: { summary: 'Current user', responses: { '200': { description: 'Public user' } } },
    },
    '/api/v1/auth/sessions': {
      get: {
        summary: 'List active sessions',
        responses: { '200': { description: 'Session list' } },
      },
    },
    '/api/v1/auth/sessions/{sessionId}': {
      delete: { summary: 'Revoke one session', responses: { '200': { description: 'Revoked' } } },
    },
    '/api/v1/servers': {
      get: {
        summary: 'List servers',
        description:
          'Supports pagination, q/search, status, agentStatus, spaceId, groupId (legacy), unassigned, tag, os, maintenance, and sort/order. Sort also accepts field:direction.',
        responses: { '200': { description: 'Paginated server list' } },
      },
      post: { summary: 'Register a server', responses: { '201': { description: 'Created' } } },
    },
    '/api/v1/servers/{serverId}': {
      get: { summary: 'Server details', responses: { '200': { description: 'Server' } } },
      patch: { summary: 'Update server', responses: { '200': { description: 'Updated' } } },
      delete: {
        summary: 'Soft-delete and revoke',
        responses: { '200': { description: 'Deleted' } },
      },
    },
    '/api/v1/servers/{serverId}/enrollment-tokens': {
      post: {
        summary: 'Issue a one-time enrollment token',
        description: 'Plaintext is returned once and stored only as a hash.',
        responses: { '200': { description: 'Token payload' } },
      },
    },
    '/api/v1/agent/enroll': {
      post: {
        summary: 'Enroll an agent with a one-time token',
        responses: { '200': { description: 'Credential id' } },
      },
    },
    '/api/v1/agent/heartbeat': {
      post: {
        summary: 'Authenticated agent heartbeat',
        responses: { '200': { description: 'Accepted' } },
      },
    },
    '/api/v1/agent/metrics': {
      post: {
        summary: 'Authenticated latest metrics ingest',
        responses: { '200': { description: 'Accepted' } },
      },
    },
    '/api/v1/server-spaces': {
      get: { summary: 'List server spaces', responses: { '200': { description: 'Spaces' } } },
      post: { summary: 'Create a server space', responses: { '201': { description: 'Created' } } },
    },
    '/api/v1/server-spaces/{id}': {
      get: { summary: 'Get a server space', responses: { '200': { description: 'Space' } } },
      patch: { summary: 'Update a server space', responses: { '200': { description: 'Updated' } } },
      delete: {
        summary: 'Delete a server space without deleting servers',
        responses: { '200': { description: 'Deleted' } },
      },
    },
    '/api/v1/server-groups': {
      get: {
        summary: 'List server spaces (legacy alias)',
        responses: { '200': { description: 'Spaces' } },
      },
      post: {
        summary: 'Create a server space (legacy alias)',
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/v1/server-groups/{id}': {
      get: {
        summary: 'Get a server space (legacy alias)',
        responses: { '200': { description: 'Space' } },
      },
      patch: {
        summary: 'Update a server space (legacy alias)',
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        summary: 'Delete a server space (legacy alias)',
        responses: { '200': { description: 'Deleted' } },
      },
    },
    '/api/v1/server-operations': {
      get: {
        summary: 'Global operation queue',
        responses: { '200': { description: 'Operations' } },
      },
    },
    '/api/v1/server-events': {
      get: { summary: 'Global server events', responses: { '200': { description: 'Events' } } },
    },
    '/api/v1/server-audit': {
      get: { summary: 'Server audit log', responses: { '200': { description: 'Audit events' } } },
    },
    '/api/v1/ssh-keys': {
      get: {
        summary: 'List SSH keys',
        description: 'Safe metadata only. Private key material is never returned.',
        responses: { '200': { description: 'Paginated SSH key list' } },
      },
    },
    '/api/v1/ssh-keys/import': {
      post: {
        summary: 'Import a private SSH key',
        description: 'The private key is encrypted at rest and is not returned.',
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/v1/ssh-keys/public': {
      post: { summary: 'Add a public SSH key', responses: { '201': { description: 'Created' } } },
    },
    '/api/v1/ssh-keys/generate': {
      post: {
        summary: 'Generate an SSH key pair',
        description: 'The private key stays inside LinuxPilot and is never returned.',
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/v1/ssh-keys/{id}': {
      get: { summary: 'SSH key details', responses: { '200': { description: 'Key metadata' } } },
      patch: {
        summary: 'Update SSH key metadata',
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        summary: 'Soft-delete an unused SSH key',
        responses: { '200': { description: 'Deleted' } },
      },
    },
  },
} as const;
