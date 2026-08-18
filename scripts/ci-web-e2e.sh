#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

AUTH_PID=0
SERVER_PID=0
GATEWAY_PID=0
WEB_PID=0

cleanup() {
  kill "$AUTH_PID" "$SERVER_PID" "$GATEWAY_PID" "$WEB_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

node services/auth-service/dist/main.js &
AUTH_PID=$!
DATABASE_URL="${DATABASE_URL_SERVERS:-${DATABASE_URL_SERVERS_TEST:-$DATABASE_URL}}" \
  node services/server-service/dist/main.js &
SERVER_PID=$!
# Gateway must never see the JWT private key, even if CI exported it for Auth Service.
(
  unset JWT_ACCESS_PRIVATE_KEY JWT_ACCESS_PRIVATE_KEY_PATH
  cd "$ROOT/gateway/api-gateway"
  node dist/main.js
) &
GATEWAY_PID=$!

ready=0
for _ in $(seq 1 80); do
  if curl -sf "http://127.0.0.1:${AUTH_SERVICE_PORT:-3001}/health" >/dev/null \
    && curl -sf "http://127.0.0.1:${SERVER_SERVICE_PORT:-3002}/ready" >/dev/null \
    && curl -sf "http://127.0.0.1:${GATEWAY_PORT:-3000}/health" >/dev/null; then
    ready=1
    break
  fi
  sleep 0.25
done
if [[ "$ready" -ne 1 ]]; then
  echo "auth-service, server-service, or api-gateway did not become healthy" >&2
  exit 1
fi

pnpm --filter @linuxpilot/web exec vite preview --host 127.0.0.1 --port 4173 &
WEB_PID=$!

ready=0
for _ in $(seq 1 80); do
  if curl -sf "http://127.0.0.1:4173" >/dev/null; then
    ready=1
    break
  fi
  sleep 0.25
done
if [[ "$ready" -ne 1 ]]; then
  echo "vite preview did not become ready on :4173" >&2
  exit 1
fi

pnpm --filter @linuxpilot/web test:e2e
