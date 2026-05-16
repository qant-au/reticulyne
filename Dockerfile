# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS build

WORKDIR /app

# Copy lockfile + manifest first so the dependency install layer is cached
# against package-lock.json content rather than busted by every source change.
COPY package.json package-lock.json ./

# Use `npm ci` for deterministic installs that fail closed on lockfile drift.
RUN npm ci

# Now copy the rest of the source. Build context is shaped by .dockerignore.
COPY . .

RUN npm run docker:build

FROM nginx:alpine

# Replace the stock nginx site config with one that ships SPA-fallback,
# security headers, gzip, and cache rules tuned for hashed asset bundles.
RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist-docker /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
