#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  python -m venv .venv
  source .venv/Scripts/activate
  pip install -r requirements.txt
else
  source .venv/Scripts/activate
fi

exec uvicorn app.main:app --reload --port 8000
