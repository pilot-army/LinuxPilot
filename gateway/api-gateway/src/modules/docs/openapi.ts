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
  },
} as const;
