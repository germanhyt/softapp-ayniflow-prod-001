#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Backend tests"
cd "$ROOT/backend"
if [ -x ".venv/Scripts/python.exe" ]; then
  PYTHON=".venv/Scripts/python.exe"
elif [ -x ".venv/bin/python" ]; then
  PYTHON=".venv/bin/python"
else
  PYTHON="python"
fi

DATABASE_URL=sqlite:// \
RATE_LIMIT_ENABLED=true \
LOG_JSON=false \
"$PYTHON" -m pytest -q

echo "==> Frontend build"
cd "$ROOT/frontend"
npm run build

echo "Verificación de producción completada."
