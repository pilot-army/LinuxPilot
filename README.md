<p align="center">
  <img src="docs/brand/logo.png" alt="LinuxPilot" width="160" height="160" />
</p>

# LinuxPilot

LinuxPilot is a control plane for Linux servers. After sign-in, an operator sees a fleet dashboard, selects a host, and works with that host through focused sections: overview, terminal, Docker, databases, files, systemd, processes, logs, network, firewall, cron, and backups.

This repository currently ships the monorepo foundation and a complete **Auth Service**. Host management services are not implemented yet.

## Architecture

The system is a pnpm + Turborepo monorepo:

- `apps/web` — React UI
- `gateway/api-gateway` — public NestJS entry point
- `services/auth-service` — private NestJS auth microservice
- `packages/*` — shared TypeScript contracts and libraries

The browser talks only to the API Gateway. The gateway forwards `/api/v1/auth/*` to Auth Service over an internal HTTP API, sets HttpOnly cookies, and never reads the auth database.

See [docs/architecture.md](docs/architecture.md) for the runtime diagram and extension notes.

## Requirements

- Node.js 20 LTS or newer (22 LTS recommended)
- pnpm 9+
- Docker and Docker Compose
- PostgreSQL 16 (provided by Compose)

## Installation

```bash
cp .env.example .env
# Replace every CHANGE_ME value. Do not commit .env.
node scripts/generate-dev-secrets.mjs

pnpm install
```

## Environment variables

All required variables are documented in [`.env.example`](.env.example). Applications validate them at startup and refuse to boot when a required value is missing or mistyped. There are no implicit secrets such as `JWT_SECRET || "secret"`.

Service-specific templates:

- `services/auth-service/.env.example`
- `gateway/api-gateway/.env.example`

## Development

Start PostgreSQL, then run migrations, seed roles, create the first admin, and start the apps:

```bash
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
pnpm auth:create-admin
pnpm dev
```

Default local URLs:

- UI: http://localhost:8080
- API Gateway: http://localhost:3000
- Auth Service: http://localhost:3001 (local process only; not published by Compose)

Local `docker compose up` serves the UI from Vite on http://localhost:8080, so source edits show up immediately. The Vite server proxies `/api` to the gateway. Tokens stay in cookies (`credentials: "include"`).

The current UI is the sign-in page at `/login` and a temporary `/dashboard` used only to confirm a successful session. Design tokens live in `apps/web/src/shared/styles`.

## Docker Compose

Compose starts PostgreSQL, Auth Service, API Gateway, and the web UI in the background. Every service uses `restart: unless-stopped`, so the stack stays up after a crash or a Docker Desktop restart until you run `docker compose down`.

```bash
cp .env.example .env
# Replace every CHANGE_ME value. Do not commit .env.
node scripts/generate-dev-secrets.mjs

docker compose up -d --build
# or: pnpm docker:up
```

Published ports:

- Web: `8080`
- API Gateway: `127.0.0.1:3000` in the local Compose overlay only
- PostgreSQL: `127.0.0.1:${POSTGRES_PORT:-5432}` only, for local migrations and tests. Change `POSTGRES_PORT` if 5432 is already taken.

Auth Service is not published. It listens on the internal `backend` network. Production Compose does not publish the gateway; browsers reach it through nginx on the web service.

Deployment is split into migrate → optional seed → admin bootstrap → process start. See [docs/operations.md](docs/operations.md).

The stack keeps running in the background. Stop it only when you want to:

```bash
docker compose down
# or: pnpm docker:down
```

## Prisma migrations

```bash
pnpm db:migrate
pnpm db:seed
```

Auth Service uses its own Prisma schema and the `linuxpilot_auth` database. Automated tests use `linuxpilot_auth_test`.

## First administrator

Public registration is disabled. Create the first `super_admin` with:

```bash
pnpm auth:create-admin
```

The command prompts for email, username, and password, or reads:

- `AUTH_ADMIN_EMAIL`
- `AUTH_ADMIN_USERNAME`
- `AUTH_ADMIN_PASSWORD`

No default password is stored in the repository.

## Tests

```bash
docker compose up -d postgres
pnpm test
pnpm test:e2e
```

Auth Service e2e tests load `services/auth-service/.env.test` and use `linuxpilot_auth_test`.

## Build

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Directory structure

```text
LinuxPilot/
├── apps/web
├── gateway/api-gateway
├── services/auth-service
├── packages/{auth-contracts,common,config,i18n,logger,tsconfig}
├── infrastructure/{docker,postgres}
├── docs
├── scripts
└── docker-compose.yml
```

## Auth API

Gateway prefix: `/api/v1`. Auth Service internal prefix: `/auth`.

| Method | Gateway | Auth Service | Notes |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | `/auth/login` | Sets cookies; tokens are not returned to the browser |
| POST | `/api/v1/auth/refresh` | `/auth/refresh` | Rotates refresh token |
| POST | `/api/v1/auth/logout` | `/auth/logout` | Revokes current session |
| POST | `/api/v1/auth/logout-all` | `/auth/logout-all` | Revokes every session |
| GET | `/api/v1/auth/me` | `/auth/me` | Current user |
| GET | `/api/v1/auth/sessions` | `/auth/sessions` | Active sessions |
| DELETE | `/api/v1/auth/sessions/:sessionId` | `/auth/sessions/:sessionId` | Revoke one session |
| GET | `/health` | `/health` | Liveness / readiness |

Success envelope:

```json
{
  "data": {},
  "meta": { "requestId": "uuid" }
}
```

Error envelope:

```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid credentials",
    "details": []
  },
  "meta": { "requestId": "uuid" }
}
```
