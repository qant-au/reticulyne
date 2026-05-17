#!/usr/bin/env bash
# restart.sh — rebuild both standalone Isoflow Docker images, serve them
# side-by-side, and (re-)sync the Graphify knowledge graph.
#
#   http://localhost:2222   isoflow            (single full-screen editor —
#                                               just the Isoflow component)
#   http://localhost:2223   isoflow-examples   (examples picker UI with the
#                                               BasicEditor / DebugTools /
#                                               ReadonlyMode menu)
#
# Usage:
#   bash restart.sh                       # rebuild & restart both, wait
#                                         # for HTTP 200, run + watch
#                                         # Graphify in background
#   PORT=3000 bash restart.sh             # override editor port (default 2222)
#   EXAMPLES_PORT=4000 bash restart.sh    # override examples port (default 2223)
#   TAG=isoflow:dev bash restart.sh
#   NO_EXAMPLES=1 bash restart.sh         # skip the examples container entirely
#   NO_GRAPHIFY=1 bash restart.sh         # skip Graphify steps entirely
#
# Exits 0 once both containers respond, or non-zero on build/start/poll
# failure. The Graphify watcher continues running in the background.

set -euo pipefail

PORT="${PORT:-2222}"
EXAMPLES_PORT="${EXAMPLES_PORT:-2223}"
TAG="${TAG:-isoflow}"
EXAMPLES_TAG="${EXAMPLES_TAG:-isoflow-examples}"
NAME="${NAME:-isoflow}"
EXAMPLES_NAME="${EXAMPLES_NAME:-isoflow-examples}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-30}"
NO_EXAMPLES="${NO_EXAMPLES:-0}"
NO_GRAPHIFY="${NO_GRAPHIFY:-0}"
GRAPHIFY_LOG="${GRAPHIFY_LOG:-graphify-out/watch.log}"
GRAPHIFY_PIDFILE="${GRAPHIFY_PIDFILE:-graphify-out/watch.pid}"

cd "$(dirname "$0")"

# Clean up our containers on SIGINT / SIGTERM. The wait_for_http
# polling loops below are the most common interrupt point — if the
# user ^Cs while the script is waiting for a slow start, the
# half-started containers would otherwise stay running until the next
# `restart.sh` invocation (which would then trip over them with a
# "name already in use" error). The trap only fires on signal-based
# interrupts, not on normal exit, so the success path leaves the
# containers running — which is the whole point of the script.
cleanup_on_interrupt() {
  echo
  echo "==> Caught interrupt — stopping any containers we started"
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  if [[ "$NO_EXAMPLES" != "1" ]]; then
    docker rm -f "$EXAMPLES_NAME" >/dev/null 2>&1 || true
  fi
  exit 130
}
trap cleanup_on_interrupt INT TERM

# wait_for_http url label
wait_for_http() {
  local url="$1"
  local label="$2"
  local deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))
  while true; do
    if curl --silent --fail --max-time 2 --output /dev/null "$url"; then
      echo "==> $label is up at $url"
      return 0
    fi
    if (( $(date +%s) >= deadline )); then
      echo "ERROR: $label did not respond within ${TIMEOUT_SECONDS}s ($url)" >&2
      return 1
    fi
    sleep 1
  done
}

# ---- Container 1: isoflow (single-editor SPA, port 2222) ----
echo "==> Stopping any prior \"$NAME\" container"
docker rm -f "$NAME" >/dev/null 2>&1 || true

echo "==> Building image \"$TAG\" (single-editor)"
docker build -t "$TAG" -f Dockerfile .

echo "==> Starting container \"$NAME\" on host port $PORT"
# Container listens on 8080 internally (nginx-unprivileged base; see BLD3-05).
docker run -d --rm --name "$NAME" -p "${PORT}:8080" "$TAG" >/dev/null

if ! wait_for_http "http://localhost:${PORT}/" "Editor"; then
  docker logs "$NAME" >&2 || true
  exit 1
fi

# ---- Container 2: isoflow-examples (examples picker UI, port 2223) ----
if [[ "$NO_EXAMPLES" == "1" ]]; then
  echo "==> Skipping examples container (NO_EXAMPLES=1)"
else
  echo "==> Stopping any prior \"$EXAMPLES_NAME\" container"
  docker rm -f "$EXAMPLES_NAME" >/dev/null 2>&1 || true

  echo "==> Building image \"$EXAMPLES_TAG\" (examples picker)"
  # Both variants share Dockerfile; the examples variant is selected
  # via build args. Defaults in the Dockerfile match the main variant.
  docker build -t "$EXAMPLES_TAG" \
    --build-arg WEBPACK_SCRIPT=docker:examples:build \
    --build-arg DIST_DIR=dist-docker-examples \
    -f Dockerfile .

  echo "==> Starting container \"$EXAMPLES_NAME\" on host port $EXAMPLES_PORT"
  # Container listens on 8080 internally (nginx-unprivileged base; see BLD3-05).
  docker run -d --rm --name "$EXAMPLES_NAME" -p "${EXAMPLES_PORT}:8080" "$EXAMPLES_TAG" >/dev/null

  if ! wait_for_http "http://localhost:${EXAMPLES_PORT}/" "Examples picker"; then
    docker logs "$EXAMPLES_NAME" >&2 || true
    exit 1
  fi
fi

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

echo "==> Done."
echo "    Editor:           http://localhost:${PORT}/"
if [[ "$NO_EXAMPLES" != "1" ]]; then
  echo "    Examples picker:  http://localhost:${EXAMPLES_PORT}/"
fi
