# Build stage: compiles the Vue 3 / Vite app into static assets.
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first so the layer is cached unless package*.json changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage: unprivileged nginx (runs as uid 101, listens on 8080).
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

# The image's entrypoint runs docker-entrypoint.d/*.sh, then renders
# /etc/nginx/templates/*.template (envsubst) into /etc/nginx/conf.d/.
COPY docker/15-public-config.envsh /docker-entrypoint.d/15-public-config.envsh
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY security-headers.inc.template /etc/nginx/templates/security-headers.inc.template
COPY --from=build /app/dist /usr/share/nginx/html

# config.json is generated at container start by the unprivileged user, so
# pre-create it with the right owner.
USER root
RUN apk upgrade --no-cache \
    && touch /usr/share/nginx/html/config.json \
    && chown nginx:nginx /usr/share/nginx/html/config.json
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
