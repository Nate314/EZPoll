FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime

# OS security fixes, and drop npm/corepack/yarn: the runtime only needs node.
RUN apk upgrade --no-cache \
    && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn*

WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# The official node image ships an unprivileged "node" user.
USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD node -e "require('net').connect(3000,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"

CMD ["node", "src/index.js"]
