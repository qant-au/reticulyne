#!/usr/bin/env bash
# restart.sh — rebuild the standalone Isoflow Docker image and serve it
# on http://localhost:2222.
#
# Usage:
#   bash restart.sh           # rebuild & restart, wait for HTTP 200
#   PORT=3000 bash restart.sh # override host port (default 2222)
#   TAG=isoflow:dev bash restart.sh
#
# Exits 0 once the editor responds on http://localhost:${PORT}/, or
# non-zero on build/start/poll failure.

set -euo pipefail

PORT="${PORT:-2222}"
TAG="${TAG:-isoflow}"
NAME="${NAME:-isoflow}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-30}"

cd "$(dirname "$0")"

echo "==> Stopping any prior \"$NAME\" container"
docker rm -f "$NAME" >/dev/null 2>&1 || true

echo "==> Building image \"$TAG\""
docker build -t "$TAG" .

echo "==> Starting container \"$NAME\" on host port $PORT"
docker run -d --rm --name "$NAME" -p "${PORT}:80" "$TAG" >/dev/null

echo "==> Waiting for http://localhost:${PORT}/ (timeout: ${TIMEOUT_SECONDS}s)"
deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))
while true; do
  if curl --silent --fail --max-time 2 --output /dev/null "http://localhost:${PORT}/"; then
    echo "==> Editor is up at http://localhost:${PORT}/"
    exit 0
  fi
  if (( $(date +%s) >= deadline )); then
    echo "ERROR: editor did not respond within ${TIMEOUT_SECONDS}s" >&2
    docker logs "$NAME" >&2 || true
    exit 1
  fi
  sleep 1
done
