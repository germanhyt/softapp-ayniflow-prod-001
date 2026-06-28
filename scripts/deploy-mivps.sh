#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-/home/projects2/ayniflow}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

cd "$APP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE in $APP_DIR" >&2
  exit 1
fi

git fetch origin main
git reset --hard origin/main
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
