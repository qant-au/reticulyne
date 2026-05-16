#!/usr/bin/env bash
# restart.sh — rebuild the standalone Isoflow Docker image, serve it
# on http://localhost:2222, and (re-)sync the Graphify knowledge graph.
#
# Usage:
#   bash restart.sh           # rebuild & restart, wait for HTTP 200,
#                             # then refresh + watch Graphify in bg
#   PORT=3000 bash restart.sh # override host port (default 2222)
#   TAG=isoflow:dev bash restart.sh
#   NO_GRAPHIFY=1 bash restart.sh   # skip Graphify steps entirely
#
# Exits 0 once the editor responds on http://localhost:${PORT}/, or
# non-zero on build/start/poll failure. The Graphify watcher continues
# running in the background — PID + log path are printed before exit.

set -euo pipefail

PORT="${PORT:-2222}"
TAG="${TAG:-isoflow}"
NAME="${NAME:-isoflow}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-30}"
NO_GRAPHIFY="${NO_GRAPHIFY:-0}"
GRAPHIFY_LOG="${GRAPHIFY_LOG:-graphify-out/watch.log}"
GRAPHIFY_PIDFILE="${GRAPHIFY_PIDFILE:-graphify-out/watch.pid}"

cd "$(dirname "$0")"

# ---- Docker: stop, build, start, wait for HTTP 200 ----
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
    break
  fi
  if (( $(date +%s) >= deadline )); then
    echo "ERROR: editor did not respond within ${TIMEOUT_SECONDS}s" >&2
    docker logs "$NAME" >&2 || true
    exit 1
  fi
  sleep 1
done

# ---- Graphify: incremental update + background watcher ----
# Graphify (https://github.com/safishamsi/graphify) is an optional Python
# CLI that maintains a queryable knowledge graph over this repo for
# coding-assistant integrations. The watcher runs in the background so
# this script does not block the user's terminal.
if [[ "$NO_GRAPHIFY" == "1" ]]; then
  echo "==> Skipping Graphify (NO_GRAPHIFY=1)"
elif ! command -v graphify >/dev/null 2>&1; then
  cat <<'EOF'
==> Graphify is not on PATH — skipping the update / watch steps.
    To install (one-time):
      uv tool install graphifyy        # recommended (also: pipx / pip)
    Then re-run `bash restart.sh` to bring the watcher up.
EOF
else
  mkdir -p graphify-out

  # Stop any prior background watcher we spawned ourselves.
  if [[ -f "$GRAPHIFY_PIDFILE" ]]; then
    old_pid=$(cat "$GRAPHIFY_PIDFILE" 2>/dev/null || true)
    if [[ -n "${old_pid:-}" ]] && kill -0 "$old_pid" 2>/dev/null; then
      echo "==> Stopping prior Graphify watcher (pid $old_pid)"
      kill "$old_pid" 2>/dev/null || true
    fi
    rm -f "$GRAPHIFY_PIDFILE"
  fi

  echo "==> Running: graphify update . (one-shot incremental sync)"
  graphify update . || echo "WARN: graphify update failed; continuing"

  echo "==> Spawning: graphify watch . (background — log: $GRAPHIFY_LOG)"
  # nohup + disown so the watcher survives this script exiting; stdout +
  # stderr go to GRAPHIFY_LOG. The PID is recorded for clean shutdowns
  # on the next restart.sh invocation.
  nohup graphify watch . >"$GRAPHIFY_LOG" 2>&1 &
  echo $! >"$GRAPHIFY_PIDFILE"
  disown || true
  echo "==> Graphify watcher started (pid $(cat "$GRAPHIFY_PIDFILE"))"
  echo "    Tail with: tail -f $GRAPHIFY_LOG"
fi

echo "==> Done. Editor: http://localhost:${PORT}/"
