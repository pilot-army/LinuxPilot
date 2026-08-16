#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo "Create a .env file from .env.example before starting development services."
  exit 1
fi

echo "Starting PostgreSQL for local development..."
docker compose up -d postgres
