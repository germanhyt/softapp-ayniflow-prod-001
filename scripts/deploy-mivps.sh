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

# Guardrail: producción no debe usar DEBUG=true (evita seed de datos de ejemplo).
if grep -Eq '^[[:space:]]*DEBUG[[:space:]]*=[[:space:]]*true[[:space:]]*$' "$ENV_FILE"; then
  echo "Refusing deploy: DEBUG=true in $ENV_FILE (activaría seed de datos de ejemplo)." >&2
  exit 1
fi

git fetch origin main
git reset --hard origin/main

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo "Esperando healthcheck del backend..."
for i in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
    curl -fsS http://127.0.0.1:8000/health/live >/dev/null; then
    echo "Healthcheck OK"
    exit 0
  fi
  sleep 2
done

echo "Healthcheck falló tras el deploy" >&2
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=80 backend
exit 1
