# Server Service

Server Service owns inventory, agent lifecycle, latest metrics, health, groups, tags, events, maintenance, updates, and the safe operation queue. It does not own interactive SSH, containers, files, databases, users, or a full time-series/alerting stack.

## Enrollment

1. A user with `servers.create` creates a server (`PENDING` + `NOT_INSTALLED`).
2. `POST /servers/{id}/enrollment-token` (alias: `/enrollment-tokens`) returns a one-time secret, `expiresAt`, and an enroll command. Only the SHA-256 hash is stored.
3. The agent calls `POST /api/v1/agent/enroll` with `{ serverId, enrollmentToken, publicKey, agentVersion }`. The token is in the body, never the URL.
4. Consume is transactional: used, expired, or revoked tokens fail. Concurrent reuse succeeds for only one request.
5. The agent receives `credentialId` and must sign later requests with its Ed25519 private key.

Rotate issues a new enrollment token and retires the current credential after the next successful enroll. Revoke immediately rejects heartbeat, metrics, and operations.

## Agent authentication

Signed headers cover agent ID, timestamp, nonce, canonical method, canonical path, and body hash. The service checks the time window, rejects replayed nonces, and compares signatures in constant time. `X-Forwarded-For` is trusted only when `TRUST_PROXY=true` on the gateway.

## Heartbeat

`POST /api/v1/agent/heartbeat` is authenticated by the agent credential. `serverId` comes from the identity, not the body. `lastSeenAt` is updated atomically. Inventory fields create an event only when they change. Frequent identical heartbeats do not write a history row every time (`METRICS_MIN_INTERVAL_MS`).

## Offline detection

`CleanupService` / status sweep uses a PostgreSQL advisory lock so multiple replicas do not emit duplicate `SERVER_OFFLINE` events. `ONLINE` requires a heartbeat newer than `OFFLINE_TIMEOUT_MS` (plus grace). Maintenance keeps `lastSeenAt` visible but suppresses ordinary offline alerts. Return to online emits one `SERVER_ONLINE` event.

## Metrics and health

- `POST /api/v1/agent/metrics` stores the latest snapshot and a bounded history row.
- `GET /servers/{id}/metrics/latest` and `GET /servers/{id}/metrics/history` never invent points.
- History older than `METRICS_RETENTION_DAYS` is deleted in batches.
- Health combines heartbeat, agent status, CPU/RAM/disk, stale metrics, outdated agent, and maintenance. Thresholds and hysteresis come from config (`HEALTH_*`, `HEALTH_HYSTERESIS_PERCENT`).

## Operations

Allowed types: `REBOOT`, `SHUTDOWN`, `REFRESH_INVENTORY`, `REFRESH_METRICS`, `CHECK_UPDATES`, `UPDATE_AGENT`.

```text
PENDING → DELIVERED → RUNNING → SUCCEEDED | FAILED
       ↘ CANCELLED / EXPIRED
DELIVERED may also complete directly (agent skipped ack).
```

User: `POST/GET /servers/{id}/operations`. Agent: `GET /api/v1/agent/operations/next`, `POST .../ack`, `POST .../result`. Transitions are CAS on `status + version`. Idempotency keys reuse the same row. TTL is `OPERATION_TTL_MS`. Parallel in-flight ops are capped by `OPERATION_MAX_PARALLEL`.

## Status calculation

Persisted operational status stays `PENDING | ONLINE | DEGRADED | OFFLINE | REVOKED`. The API may surface `MAINTENANCE` when `maintenanceMode` is true. Agent status is `CONNECTED | DISCONNECTED | NOT_INSTALLED | REVOKED | OUTDATED`.

## Background jobs

| Job | Config | Safety |
| --- | --- | --- |
| Offline sweep | `STATUS_SWEEP_INTERVAL_MS`, `OFFLINE_TIMEOUT_MS` | Advisory lock + conditional updates |
| Metrics retention | `METRICS_RETENTION_DAYS`, `METRICS_CLEANUP_*` | Batched deletes |
| Event retention | `EVENTS_RETENTION_DAYS` | Batched deletes |
| Operation expiry | `OPERATION_TTL_MS` | CAS to `EXPIRED` |
| Maintenance end | `endsAt` | Conditional clear + event |

Jobs stop on graceful shutdown with the NestJS lifecycle.

## Permissions

Existing Auth permissions are reused: `servers.view/create/update/delete` and `audit.view`. Groups, tags, maintenance, and operations map to `servers.update`. Enrollment/rotate map to `servers.create`. Revoke/delete map to `servers.delete`. Global server audit uses `audit.view`.
