# Build stage: compiles the Vue 2 / vue-cli-service app into static assets.
# node:18-alpine is a current LTS release that is still compatible with
# vue-cli 4.x / Vue 2 (this repo's Vue/Vue CLI versions are unchanged).
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies first so the layer is cached unless package*.json changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# webpack 4 (used by @vue/cli-service 4.x) uses MD4 hashing via Node's legacy
# OpenSSL provider, which Node 17+ removed by default. This only affects the
# build toolchain, not the shipped app.
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm run build

# Runtime stage: serve the built static files with nginx.
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
