# LinuxPilot architecture

LinuxPilot is a monorepo for a centralized Linux server control plane. This stage delivers Auth Service plus a production-grade Servers MVP: registration, agent enrollment, heartbeat, and read-only host metrics.

## Runtime topology

```text
Browser
  └── apps/web  (React, Vite)
        └── /api/v1/*  (same origin in Docker via nginx)
              └── gateway/api-gateway
                    ├── signed HTTP  http://auth-service:3001
                    │     └── PostgreSQL (linuxpilot_auth)
                    └── signed HTTP  http://server-service:3002
                          └── PostgreSQL (linuxpilot_servers)

Linux Agent
  └── HTTPS  /api/v1/agent/*
        └── gateway/api-gateway   (agent ingress; no cookies, no CSRF)
              └── signed HTTP  http://server-service:3002
```

- The browser never talks to Auth Service or Server Service.
- API Gateway is the only public API. In production it must sit behind nginx/another reverse proxy and must not be published on the internet.
- Auth Service owns users, sessions, roles, permissions, and auth audit events.
- Server Service owns servers, agent credentials, metrics, and server audit events.
- Auth Service does not accept agent requests.

## Agent ingress

Agents enter through the existing API Gateway on `/api/v1/agent/*`.

This is preferred over a separate Agent Ingress or a public Server Service port:

- Server Service stays on the internal Docker network with no host port.
- Auth Service never sees agent traffic.
- Browser cookie/CSRF auth is not used on agent routes.
- Each agent has its own Ed25519 key. There is no global agent secret.
- A later move to mTLS happens at the reverse proxy in front of the gateway, with real certificates. This release does not pretend that HMAC or Ed25519 is mTLS.

## Shared packages

| Package | Responsibility |
| --- | --- |
| `@linuxpilot/auth-contracts` | Public DTOs, permission/role constants, token and user types |
| `@linuxpilot/server-contracts` | Server/agent DTOs, statuses, and Zod schemas |
| `@linuxpilot/common` | API envelope, errors, service-auth HMAC, agent Ed25519 helpers |
| `@linuxpilot/config` | Typed environment loading with fail-fast validation |
| `@linuxpilot/logger` | Structured pino logs with secret redaction |
| `@linuxpilot/i18n` | Locale catalogs (`uk` default, `en` fallback) and locale helpers |
| `@linuxpilot/tsconfig` | Shared TypeScript bases |

## Auth model

- Access token: RS256 JWT. Auth Service holds the private key; Gateway and Server Service verify with the public key only. Issuer `linuxpilot-auth`, audience `linuxpilot-gateway`.
- Refresh token: opaque `sessionId.secret`, hashed (SHA-256) in PostgreSQL.
- Each login starts a token family (`familyId`). Rotation is an atomic compare-and-swap on the current hash.
- A random secret mismatch is `TOKEN_INVALID` and does not revoke other sessions.
- Proven reuse of a previously rotated refresh token revokes **that token family only**.
- A concurrent retry inside `REFRESH_REUSE_GRACE_MS` is treated as `TOKEN_INVALID`, not reuse.
- Passwords are hashed with Argon2id. There is no public registration.
- Usernames are stored with a display form and a unique NFC + lowercase `usernameNormalized` column.

## Servers model

- A server starts as `PENDING` + `NOT_INSTALLED` until the first valid heartbeat.
- Operational `status` and `agentStatus` are computed separately. `MAINTENANCE` is an API overlay when `maintenanceMode` is on; the last operational status stays in the database.
- `ONLINE` / `DEGRADED` come from recent heartbeats. `DEGRADED` means incomplete metrics, a warning threshold, or an outdated agent.
- `OFFLINE` is computed from `lastSeenAt` and a periodic batch sweep with a PostgreSQL advisory lock. The sweep is not a per-second full-table cron. Maintenance suppresses repeated offline events.
- `REVOKED` blocks the agent immediately. Delete is soft-delete plus revoke.
- Enrollment tokens are cryptographically random, short-lived, single-use, and stored only as SHA-256 hashes. The plaintext is returned once and is never listed or logged.
- After enrollment the agent uses its own Ed25519 credential. User JWTs are not accepted on `/api/v1/agent/*`.
- Agent requests are signed with Ed25519 over timestamp, nonce, method, path/query, and body hash. Nonces are persisted and cannot be reused.
- Latest metrics are stored for list/detail views. History is a bounded retention table, not a TSDB. Empty history returns `[]`.
- Safe operations (`REBOOT`, `SHUTDOWN`, `REFRESH_*`, `CHECK_UPDATES`, `UPDATE_AGENT`) go through a CAS state machine. There is no arbitrary shell execution.

See [server-service.md](./server-service.md) for enrollment, heartbeat, operations, health, and job configuration.

## Status and session policy

- `PENDING` and `BLOCKED` cannot login, refresh, or use an existing access token.
- Changing a user to `PENDING` or `BLOCKED` revokes every session immediately.
- Changing a user back to `ACTIVE` does not restore revoked sessions.

## Rate limiting

Gateway throttling is **in-memory only** (`RATE_LIMIT_STORE=memory`). It is not shared across replicas. Put a reverse-proxy or edge limiter in front if you run more than one gateway instance.

`X-Forwarded-For` is used only when `TRUST_PROXY=true`.

Agent routes use a dedicated `agent` throttler and skip browser CSRF.

## Service-to-service authentication

Gateway signs every Auth Service and Server Service request with HMAC-SHA256 over timestamp, nonce, method, path, and body hash. Downstream services reject stale timestamps and replayed nonces. Rotate by introducing a new `SERVICE_AUTH_SECRET` and keeping the previous value in `SERVICE_AUTH_SECRET_PREVIOUS` until all replicas are updated.

TLS/mTLS between services is recommended on the internal network but is not fabricated here. Use a service mesh or terminate TLS with real certificates if you need encryption in transit beyond the Docker network boundary.

## Extension points

Redis and RabbitMQ are not wired yet. New services should follow the same pattern as Auth Service and Server Service: own package, own Dockerfile, own database, contracts in `packages/*`, and an internal HTTP client in the gateway. New host operations must use `@RequirePermissions()`; unannotated non-public routes are denied.
