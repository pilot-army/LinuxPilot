# Production checklist

- [ ] Replace every `CHANGE_ME` value. Do not reuse development secrets.
- [ ] Generate production RS256 keys offline and mount them as files. Never bake private keys into images.
- [ ] Set `COOKIE_SECURE=true` and terminate HTTPS in front of the UI.
- [ ] Do not publish `api-gateway`, `auth-service`, or `server-service` ports to the internet. Only the reverse proxy / web port should be public.
- [ ] Set `TRUST_PROXY=true` only for the hop count of your real reverse proxy.
- [ ] Set `FRONTEND_ORIGIN` to the public UI origin.
- [ ] Run `pnpm db:migrate:deploy` (or the `auth-migrate` and `server-migrate` Compose services) before starting Auth Service and Server Service.
- [ ] Confirm `OFFLINE_TIMEOUT_MS` is greater than `HEARTBEAT_INTERVAL_MS`.
- [ ] Create the first administrator with `pnpm auth:create-admin`. Do not rely on seed for production users.
- [ ] Optional: `pnpm db:seed` only to insert missing role/permission rows. Seed does not reset custom role mappings.
- [ ] Confirm Auth Service is not reachable from the public network.
- [ ] Put a shared/edge rate limiter in front if you run more than one gateway replica. Process memory throttling is not distributed.
- [ ] Configure PostgreSQL backups and test a restore. See [operations.md](operations.md).
- [ ] Document who receives GitHub private vulnerability reports.
- [ ] Choose a license and replace `LICENSE-TODO.md`.
