# LinuxPilot architecture

LinuxPilot is a monorepo for a centralized Linux server control plane. This stage delivers the foundation and a complete Auth Service. Server, Docker, database, and other domain services are intentionally out of scope.

## Runtime topology

```text
Browser
  └── apps/web  (React, Vite)
        └── /api/v1/*  (same origin in Docker via nginx)
              └── gateway/api-gateway
                    └── signed HTTP  http://auth-service:3001
                          └── PostgreSQL (linuxpilot_auth)
```

- The browser never talks to Auth Service.
- API Gateway is the only public API. In production it must sit behind nginx/another reverse proxy and must not be published on the internet.
- Auth Service owns users, sessions, roles, permissions, and audit events.
- Auth Service is reachable only on the internal Docker network.

## Shared packages

| Package | Responsibility |
| --- | --- |
| `@linuxpilot/auth-contracts` | Public DTOs, permission/role constants, token and user types |
| `@linuxpilot/common` | API envelope, errors, email/username helpers, TTL, service-auth HMAC |
| `@linuxpilot/config` | Typed environment loading with fail-fast validation |
| `@linuxpilot/logger` | Structured pino logs with secret redaction |
| `@linuxpilot/i18n` | Locale catalogs (`uk` default, `en` fallback) and locale helpers |
| `@linuxpilot/tsconfig` | Shared TypeScript bases |

## Auth model

- Access token: RS256 JWT. Auth Service holds the private key; Gateway verifies with the public key only. Issuer `linuxpilot-auth`, audience `linuxpilot-gateway`.
- Refresh token: opaque `sessionId.secret`, hashed (SHA-256) in PostgreSQL.
- Each login starts a token family (`familyId`). Rotation is an atomic compare-and-swap on the current hash.
- A random secret mismatch is `TOKEN_INVALID` and does not revoke other sessions.
- Proven reuse of a previously rotated refresh token revokes **that token family only**.
- A concurrent retry inside `REFRESH_REUSE_GRACE_MS` is treated as `TOKEN_INVALID`, not reuse.
- Passwords are hashed with Argon2id. There is no public registration.
- Usernames are stored with a display form and a unique NFC + lowercase `usernameNormalized` column.

## Status and session policy

- `PENDING` and `BLOCKED` cannot login, refresh, or use an existing access token.
- Changing a user to `PENDING` or `BLOCKED` revokes every session immediately.
- Changing a user back to `ACTIVE` does not restore revoked sessions.

## Rate limiting

Gateway throttling is **in-memory only** (`RATE_LIMIT_STORE=memory`). It is not shared across replicas. Put a reverse-proxy or edge limiter in front if you run more than one gateway instance.

`X-Forwarded-For` is used only when `TRUST_PROXY=true`.

## Service-to-service authentication

Gateway signs every Auth Service request with HMAC-SHA256 over timestamp, nonce, method, path, and body hash. Auth Service rejects stale timestamps and replayed nonces. Rotate by introducing a new `SERVICE_AUTH_SECRET` and keeping the previous value in `SERVICE_AUTH_SECRET_PREVIOUS` until all replicas are updated.

TLS/mTLS between services is recommended on the internal network but is not fabricated here. Use a service mesh or terminate TLS with real certificates if you need encryption in transit beyond the Docker network boundary.

## Extension points

Redis and RabbitMQ are not wired yet. New services should follow the same pattern as Auth Service: own package, own Dockerfile, own database or schema, contracts in `packages/*`, and an internal HTTP (later AMQP) client in the gateway. New host operations must use `@RequirePermissions()`; unannotated non-public routes are denied.
