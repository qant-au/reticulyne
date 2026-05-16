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

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
