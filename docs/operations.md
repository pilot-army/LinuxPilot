# Operations

## Deployment flow

1. Provision PostgreSQL and generate production RS256 keys plus `SERVICE_AUTH_SECRET`.
   Keys from `node scripts/generate-dev-secrets.mjs` are marked `LINUXPILOT_DEV_ONLY` and are rejected in production.
   Compose requires explicit `SERVICE_AUTH_SECRET`, `COOKIE_SECURE`, `TRUST_PROXY`, and `FRONTEND_ORIGIN`.
2. Apply schema: `pnpm db:migrate:deploy` or start the `auth-migrate` and `server-migrate` Compose services.
   Server Service uses the separate `linuxpilot_servers` database. On an existing Postgres volume create it once:

   ```bash
   docker compose exec postgres psql -U "$POSTGRES_USER" -d postgres -c 'CREATE DATABASE linuxpilot_servers;'
   ```
3. Optional catalog seed: `pnpm db:seed` (roles/permissions only; custom mappings are kept).
4. Bootstrap the first administrator: `pnpm auth:create-admin`.
5. Start Auth Service and Server Service, then API Gateway, then the web UI.
6. Confirm `/health` on the gateway through the reverse proxy.

Do not start Auth Service with an automatic seed. Seed is an explicit command.

## PostgreSQL backup

```bash
docker compose exec postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > backup.dump
```

## PostgreSQL restore

```bash
docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < backup.dump
```

Restore on a stopped Auth Service, then start the service and confirm login. Test this procedure on a staging copy before using it in production.

## JWT key rotation

1. Generate a new RS256 key pair.
2. Auth Service must verify existing access tokens until they expire, so a dual-key window is required for a zero-downtime rotation. This release verifies a single public key. Practical approach:
   - Deploy the new private key to Auth Service and the matching public key to Gateway at the same time.
   - Existing access cookies become invalid immediately; refresh tokens still work and mint new access JWTs.
3. Remove the old private key from disk after the cutover.
4. Never copy the private key to the gateway image or environment.

## Service secret rotation

1. Generate a new `SERVICE_AUTH_SECRET`.
2. Set `SERVICE_AUTH_SECRET_PREVIOUS` to the current secret on Auth Service and Server Service.
3. Deploy Auth Service and Server Service.
4. Deploy Gateway with the new `SERVICE_AUTH_SECRET`.
5. After all gateway replicas are updated, remove `SERVICE_AUTH_SECRET_PREVIOUS`.

## Session cleanup

Auth Service deletes expired sessions and revoked sessions older than `SESSION_REVOKED_RETENTION_DAYS` on an interval. Multiple replicas use a PostgreSQL advisory lock so only one cleanup runs at a time.

Server Service deletes metrics older than `METRICS_RETENTION_DAYS` in batches and marks stale heartbeats offline. Both jobs use advisory locks.

## Agent install

See `apps/agent/packaging/install.md`. Enroll with a one-time token from stdin or a `0600` file. Do not put the token in a URL and do not use `curl | sudo bash` as the only install method.
