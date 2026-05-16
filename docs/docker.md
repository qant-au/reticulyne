# Standalone Docker deployment

The repository ships a self-contained Docker image that serves the editor as a static SPA over nginx. This is the right choice when you want a deployable instance of the editor without embedding it inside your own React application — for example, to run a private editor for a team on an internal subdomain.

> If you want to **embed** the editor as a component inside an existing React app, install `@qant-au/isoflow` from GitHub Packages and follow [`embedding.md`](./embedding.md) instead.

## What's in the image

A two-stage build:

1. **Build stage** (`node:22-alpine`): `npm ci` then `npm run docker:build` (webpack production build, output → `dist-docker/`).
2. **Runtime stage** (`nginx:alpine`): the `dist-docker/` directory copied into `/usr/share/nginx/html`, served by nginx with a custom site config (`docker/nginx.conf`).

Image footprint after the multi-stage build: a few MB of static assets plus nginx, no Node.js at runtime.

## Build and run

The repo includes `restart.sh` at its root for the common rebuild-and-serve loop:

```bash
bash restart.sh
```

That script:
1. Stops and removes any prior `isoflow` container.
2. Rebuilds the image (`docker build -t isoflow .`).
3. Starts the container detached on host port `2222`.
4. Polls `http://localhost:2222/` until 200 OK (timeout 30s).

Environment overrides for non-default workflows:

```bash
PORT=3000 bash restart.sh
TAG=isoflow:dev bash restart.sh
NAME=isoflow-staging bash restart.sh
TIMEOUT_SECONDS=60 bash restart.sh
```

Or run the docker commands by hand:

```bash
docker build -t isoflow .
docker run -d --rm --name isoflow -p 2222:80 isoflow
```

## What's on the wire

The custom nginx config (`docker/nginx.conf`) ships:

- **SPA fallback:** every client-side route that doesn't match a file returns `index.html`. Refreshing a deep link no longer 404s.
- **Cache discipline:** hashed asset bundles (JS, CSS, fonts, images) get `Cache-Control: public, max-age=31536000, immutable`. `index.html` gets `Cache-Control: no-cache, no-store, must-revalidate` so a redeploy is picked up on the next request.
- **gzip:** on for `application/javascript`, `text/css`, `application/json`, `image/svg+xml`, `font/woff*`, and the usual peers.
- **Security headers** (applied to every response):
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer-when-downgrade`
  - `Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()`
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://isoflow.io https://static.isoflow.io; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'`
- **`server_tokens off`** so the nginx version isn't disclosed.
- **`autoindex off`** so directory contents aren't listed.

The CSP allows the Google Fonts CDN (used by the bundled standalone `index.html` for Noto Sans) and `isoflow.io` (vendored icon-pack image hosts). If you fork the image and replace the font or icon sources, update the CSP accordingly.

## Healthcheck

The Dockerfile declares a `HEALTHCHECK`:

```
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1
```

`docker inspect --format '{{json .State.Health}}' <container>` reports the status. Compose/k8s/ECS use the same signal.

## Persistence

The standalone editor is **stateless**: there is no backend, no database, no `localStorage` persistence. Refreshing the page loses unsaved work. The intended workflow is:

1. Open the editor in a browser tab.
2. Build the diagram.
3. Use the main-menu **Export** action to download the model as JSON or PNG.
4. Re-import the JSON later via the main menu to continue editing.

If you need persistent storage across sessions, embed the editor inside your own application instead (see [`embedding.md`](./embedding.md)) and connect the `onModelUpdated` callback to your backend.

## Reverse-proxy notes

If you front the container with a reverse proxy (Caddy / Traefik / nginx ingress) that adds its own TLS, security headers, or Content-Security-Policy:

- Two CSPs concatenate, not override — the strictest wins. Keep the container's CSP unchanged unless you've reasoned about the combined policy.
- `Cache-Control` upstream of nginx will be respected by clients but not by intermediate caches; if you cache, set asset cache lifetimes on the upstream too.
- The healthcheck targets `127.0.0.1` inside the container, not the proxy. No reconfiguration needed.

## Troubleshooting

**`docker build` fails with `ETIMEDOUT` during `npm ci`.**
The Dockerfile raises `npm config set fetch-timeout 600000` and `fetch-retries 5` before the install. On a sufficiently slow network you can raise those values further by editing the Dockerfile; if they're still timing out, your build is reaching the public npm registry from inside docker without network reachability — check Docker's DNS configuration or use a registry mirror.

**`restart.sh` times out polling `http://localhost:2222/`.**
The script dumps `docker logs isoflow` on timeout. Most common cause: an nginx config syntax error introduced by editing `docker/nginx.conf`. Run `docker run --rm -it isoflow nginx -t` to validate the config without serving.

**Port `2222` already in use.**
Override with `PORT=3000 bash restart.sh`, or stop the conflicting process: `lsof -i :2222`.
