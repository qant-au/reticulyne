# syntax=docker/dockerfile:1.7
#
# Standalone Isoflow nginx image. Two variants share this single
# Dockerfile, parameterised via two build args:
#
#   # Main editor (single <Isoflow> SPA, src/index-docker.tsx entry):
#   docker build -t isoflow .
#
#   # Examples picker (BasicEditor / DebugTools / ReadonlyMode, src/index.tsx):
#   docker build \
#     --build-arg WEBPACK_SCRIPT=docker:examples:build \
#     --build-arg DIST_DIR=dist-docker-examples \
#     -t isoflow-examples .
#
# Defaults match the main editor variant. `restart.sh` is the
# canonical caller for both variants.

ARG WEBPACK_SCRIPT=docker:build
ARG DIST_DIR=dist-docker

FROM node:22.22-alpine AS build

# Re-declare the ARG so it's available inside this stage. ARGs set
# before the first FROM are otherwise only usable as substitutions
# in subsequent FROM lines.
ARG WEBPACK_SCRIPT

WORKDIR /app

# Copy lockfile + manifest first so the dependency install layer is cached
# against package-lock.json content rather than busted by every source change.
COPY package.json package-lock.json ./

# Raise npm's network timeout + retries before `npm ci`. Defaults
# (~60s, 2 retries) drop the build on slower x86 networks / under
# registry latency spikes; 10 minutes + 5 retries is the upstream-
# recommended setting for CI environments and is a no-op on fast
# networks.
RUN npm config set fetch-timeout 600000 \
    && npm config set fetch-retries 5

# Use `npm ci` for deterministic installs that fail closed on lockfile drift.
RUN npm ci

# Now copy the rest of the source. Build context is shaped by .dockerignore.
COPY . .

RUN npm run "${WEBPACK_SCRIPT}"

# nginx-unprivileged variant — runs as the `nginx` user (uid 101) and
# listens on 8080 out of the box, so the container ships without ever
# starting a root-owned process. Pinned to the nginx stable line.
FROM nginxinc/nginx-unprivileged:1.30-alpine

# Re-declare so the COPY below can substitute it.
ARG DIST_DIR

# Replace the stock nginx site config with one that ships SPA-fallback,
# security headers, gzip, and cache rules tuned for hashed asset bundles.
# `--chown` keeps the ownership consistent with the rest of the image.
COPY --chown=nginx:nginx docker/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build --chown=nginx:nginx /app/${DIST_DIR} /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
