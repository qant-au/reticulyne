# Standalone Docker deployment

The repository ships a self-contained Docker image that serves the editor as a static SPA over nginx. This is the right choice when you want a deployable instance of the editor without embedding it inside your own React application — for example, to run a private editor for a team on an internal subdomain.

> If you want to **embed** the editor as a component inside an existing React app, install `@qant-au/reticulyne` from GitHub Packages and follow [`embedding.md`](./embedding.md) instead.

## What's in the image

A two-stage build:

1. **Build stage** (`node:22.22-alpine`): `npm ci` then `npm run docker:build` (webpack production build, output → `dist-docker/`).
2. **Runtime stage** (`nginxinc/nginx-unprivileged:1.30-alpine`): the `dist-docker/` directory copied into `/usr/share/nginx/html`, served by nginx with a custom site config (`docker/nginx.conf`).

Image footprint after the multi-stage build: a few MB of static assets plus nginx, no Node.js at runtime. The runtime stage runs as the non-root `nginx` user (uid 101) and listens on port **8080** inside the container; host port mapping happens in `restart.sh` (or in your own `docker run -p`).

## Two images, one Dockerfile

The repo ships **two** standalone image variants, both built from a single `Dockerfile` parameterised via two build args (`WEBPACK_SCRIPT` and `DIST_DIR`). `restart.sh` runs both side-by-side by default:

| Container | Tag | Webpack entry | Host port (default) | What it serves |
|---|---|---|---|---|
| `reticulyne` | `reticulyne` | `src/index-docker.tsx` | `2222` | Single full-screen `<Reticulyne>` component. Intended for production-shaped deployments where the editor IS the page. |
| `reticulyne-examples` | `reticulyne-examples` | `src/index.tsx` | `2223` | Examples-picker UI with the BasicEditor / DebugTools / ReadonlyMode menu. Useful for showcasing the embedding modes and for hand-testing in a browser. |

The Dockerfile defaults match the main editor variant. The examples variant is selected at build time via `--build-arg WEBPACK_SCRIPT=docker:examples:build --build-arg DIST_DIR=dist-docker-examples` (which `restart.sh` does automatically). Both variants use the same `docker/nginx.conf` and the same `nginxinc/nginx-unprivileged:1.30-alpine` runtime base, so security headers, CSP, gzip, and cache discipline apply identically.

Skip the examples container with `NO_EXAMPLES=1 bash restart.sh` if you only want the main editor up.

## Where the images come from

**Build locally; no image is published.** There is no `ghcr.io/qant-au/reticulyne` image and no registry push in CI. Build from a checkout with `bash restart.sh` or the `docker build` commands below. The published artefact is the npm package `@qant-au/reticulyne`; the image is a convenience wrapper around that same build (BLD-07). If a team ever needs to pull a prebuilt image, add a tag-triggered GHCR workflow at that point.

## Build and run

The repo includes `restart.sh` at its root for the common rebuild-and-serve loop:

```bash
bash restart.sh
```

That script:
1. Stops and removes any prior `reticulyne` / `reticulyne-examples` containers.
2. Rebuilds both images from the single `Dockerfile` — defaults give the main editor; the examples variant is built with `--build-arg WEBPACK_SCRIPT=docker:examples:build --build-arg DIST_DIR=dist-docker-examples`.
3. Starts both containers detached on host ports `2222` and `2223`, mapping each to the container's `8080`.
4. Polls each URL until 200 OK (timeout 30s).

Environment overrides for non-default workflows:

```bash
PORT=3000 bash restart.sh                      # override main editor host port
EXAMPLES_PORT=4000 bash restart.sh             # override examples picker host port
TAG=reticulyne:dev bash restart.sh
NAME=reticulyne-staging bash restart.sh
NO_EXAMPLES=1 bash restart.sh                  # skip the examples container
TIMEOUT_SECONDS=60 bash restart.sh
```

Or run the docker commands by hand:

```bash
# Main editor:
docker build -t reticulyne .
docker run -d --rm --name reticulyne -p 2222:8080 reticulyne

# Examples picker:
docker build \
  --build-arg WEBPACK_SCRIPT=docker:examples:build \
  --build-arg DIST_DIR=dist-docker-examples \
  -t reticulyne-examples .
docker run -d --rm --name reticulyne-examples -p 2223:8080 reticulyne-examples
```

(Note the internal port `8080`, not `80` — see "What's in the image" above.)

## What's on the wire

The custom nginx config (`docker/nginx.conf`) ships:

- **SPA fallback:** every client-side route that doesn't match a file returns `index.html`. Refreshing a deep link no longer 404s.
- **Cache discipline:** asset bundles (JS, CSS, fonts, images) get `Cache-Control: public, max-age=31536000, immutable`, which is safe because every bundle name carries a content hash (`main.<hash>.js`; until APP-02 it was a plain `main.js`, so returning users could keep an old build for up to a year). `index.html` gets `Cache-Control: no-cache, no-store, must-revalidate` so a redeploy is picked up on the next request, and `sw.js` and `manifest.webmanifest` get `no-cache` for the same reason.
- **gzip:** on for `application/javascript`, `text/css`, `application/json`, `image/svg+xml`, `font/woff*`, and the usual peers.
- **Security headers** (applied to every response):
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (assumes HTTPS-only ingress — see [`SECURITY.md`](../SECURITY.md); drop it if you knowingly serve over plain HTTP)
  - `Referrer-Policy: no-referrer-when-downgrade`
  - `X-Frame-Options: SAMEORIGIN` (legacy fallback — modern browsers honour the CSP `frame-ancestors` directive below)
  - `Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()`
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'`
- **`server_tokens off`** so the nginx version isn't disclosed.
- **`autoindex off`** so directory contents aren't listed.

The page loads no web fonts (the editor uses the system font stack); the CSP still allows the Google Fonts CDN for forks that add one. Images are restricted to `'self'`, `data:`, and `blob:` — the bundled icon packs are inlined as `data:` URIs, so no external image origins are allowed. If you fork the image and replace the font sources or add externally-hosted icons, update the CSP accordingly.

## Install and offline (PWA)

The editor image is a Progressive Web App (APP-02). Chrome and Edge on macOS, Windows, Linux and ChromeOS offer **Install** in the address bar, and the installed app opens in its own window, titled with the open diagram's name.

- **A service worker is active** (`sw.js`). At install it caches every file the build emitted, so after one visit the editor opens with no network. Pages are fetched network-first, so a redeploy is picked up on the next load; the bundles themselves are cache-first, which is safe because their names are content-hashed. Google Fonts are not cached, so offline the editor falls back to a system font.
- **Service workers need HTTPS** (or `localhost`). Behind plain HTTP the worker is not registered and the editor behaves as before, online only.
- **Diagrams are stored in the browser either way** (see Persistence), so an installed editor keeps working offline with its saved diagrams.
- To remove it: uninstall the app, or clear site data for the editor's origin, which also deletes saved diagrams.

## Healthcheck

The Dockerfile declares a `HEALTHCHECK`:

```
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/ || exit 1
```

`docker inspect --format '{{json .State.Health}}' <container>` reports the status. Compose/k8s/ECS use the same signal.

## Persistence

The standalone editor keeps diagrams in the **browser's `localStorage`** (APP-01). There is still no backend: each browser has its own diagrams, and clearing site data deletes them.

- **Diagrams** (the button at the top): **New diagram**, **Import from file…** (opens an exported JSON as a new, unsaved diagram), and the saved diagrams, newest first, to switch between or delete. Leaving a diagram with unsaved changes asks first; deleting asks first.
- **Saving:** the main menu's **Save**, and **auto-save 5 seconds after an edit** once the diagram has a name (**Rename diagram**). An `Untitled` diagram is only saved when you choose Save. The status pill in the title bar shows Saved / Unsaved / Saving, and closing the tab with unsaved changes warns.
- **What is stored:** the diagram itself, plus any icons you uploaded. The bundled icon packs (about 4 MB) are left out and restored on load, so a diagram typically takes a few KB of the browser's ~5 MB quota. If the quota is full, the save fails with a message saying to delete a diagram.
- **The library's Open entry is replaced by Import** in this image: Open loads a file over the diagram that is open, and the next save would overwrite it.
- **Export** (JSON, PNG, PDF, SVG) is unchanged and is the way to move a diagram to another browser or keep a copy outside it.

For storage shared between people or devices, embed the editor in your own application instead (see [`embedding.md`](./embedding.md)) and connect `onSave` to your backend.

## Reverse-proxy notes

If you front the container with a reverse proxy (Caddy / Traefik / nginx ingress) that adds its own TLS, security headers, or Content-Security-Policy:

- Two CSPs concatenate, not override — the strictest wins. Keep the container's CSP unchanged unless you've reasoned about the combined policy.
- `Cache-Control` upstream of nginx will be respected by clients but not by intermediate caches; if you cache, set asset cache lifetimes on the upstream too.
- The healthcheck targets `127.0.0.1` inside the container, not the proxy. No reconfiguration needed.

## Troubleshooting

**`docker build` fails with `ETIMEDOUT` during `npm ci`.**
The Dockerfile raises `npm config set fetch-timeout 600000` and `fetch-retries 5` before the install. On a sufficiently slow network you can raise those values further by editing the Dockerfile; if they're still timing out, your build is reaching the public npm registry from inside docker without network reachability — check Docker's DNS configuration or use a registry mirror.

**`restart.sh` times out polling `http://localhost:2222/`.**
The script dumps `docker logs reticulyne` on timeout. Most common cause: an nginx config syntax error introduced by editing `docker/nginx.conf`. Run `docker run --rm -it reticulyne nginx -t` to validate the config without serving.

**Port `2222` already in use.**
Override with `PORT=3000 bash restart.sh`, or stop the conflicting process: `lsof -i :2222`.
