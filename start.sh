#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

load_env_file() {
  local key value env_file="$project_root/.env"
  [ -f "$env_file" ] || return 0
  while IFS='=' read -r key value; do
    key="${key#export }"; [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    [ -z "${!key+x}" ] || continue; value="${value%$'\r'}"
    if [[ "$value" == \"*\" && "$value" == *\" ]]; then value="${value:1:${#value}-2}"; elif [[ "$value" == \'*\' && "$value" == *\' ]]; then value="${value:1:${#value}-2}"; fi
    export "$key=$value"
  done < "$env_file"
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  echo "Usage: ./start.sh"
  echo "Startup never installs packages, creates/resets/seeds a database, rewrites credentials, or kills unrelated processes."
  echo "Apply reviewed migrations separately with: npm --prefix backend run db:deploy"
  exit 0
fi
if [ "$#" -ne 0 ]; then echo "Unknown argument: $1"; exit 2; fi

load_env_file
backend_port="${BACKEND_PORT:-${PORT:?PORT or BACKEND_PORT is required}}"
frontend_port="${FRONTEND_PORT:?FRONTEND_PORT is required}"
export PORT="$backend_port"
export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://${FRONTEND_HOST:-127.0.0.1}:$frontend_port}"

for required in DATABASE_URL JWT_SECRET ALLOWED_ORIGINS OPENROUTER_API_KEY OPENROUTER_MODEL OPENROUTER_BASE_URL; do
  if [ -z "${!required:-}" ]; then echo "Missing required environment variable: ${required}"; exit 1; fi
done
if [ "$backend_port" = "$frontend_port" ]; then
  echo "BACKEND_PORT and FRONTEND_PORT must be distinct" >&2; exit 1
fi
if [ "$OPENROUTER_BASE_URL" != "https://openrouter.ai/api/v1" ]; then
  echo "OPENROUTER_BASE_URL must be https://openrouter.ai/api/v1" >&2; exit 1
fi
case "${ALLOW_SCHEMA_MIGRATION:-}" in true|1) ;; *) echo "ALLOW_SCHEMA_MIGRATION=true is required" >&2; exit 1;; esac
if [ ! -d "$project_root/backend/node_modules" ] || [ ! -d "$project_root/frontend/node_modules" ]; then
  echo "Dependencies are missing. Run npm ci separately in backend and frontend."
  exit 1
fi
for assigned_port in "$backend_port" "$frontend_port"; do
  if command -v lsof >/dev/null 2>&1 && lsof -tiTCP:"$assigned_port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $assigned_port is already in use; refusing to terminate another process." >&2; exit 1
  fi
done

(cd "$project_root/backend" && npm run db:deploy && npm run create-admin)

backend_pid=""
frontend_pid=""
cleanup() {
  if [ -n "$backend_pid" ]; then kill "$backend_pid" 2>/dev/null || true; fi
  if [ -n "$frontend_pid" ]; then kill "$frontend_pid" 2>/dev/null || true; fi
  wait "$backend_pid" "$frontend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting marketing API and frontend without changing persistent state."
(cd "$project_root/backend" && npm run serve) &
backend_pid=$!
(cd "$project_root/frontend" && VITE_BACKEND_PORT="$backend_port" VITE_FRONT_PORT="$frontend_port" npm run dev -- --host "${FRONTEND_HOST:-127.0.0.1}" --port "$frontend_port" --strictPort) &
frontend_pid=$!
while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do sleep 1; done
wait "$backend_pid" "$frontend_pid"
