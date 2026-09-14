# node:18-alpine is a current LTS release; it remains compatible with the
# socket.io 2.x / express server code in this repo (versions unchanged).
FROM node:18-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# "npm run build" transpiles src/ (and copies config.json etc) into dist/ via babel.
RUN npm run build

# Runtime stage: only production dependencies + the built dist/ output.
FROM node:18-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/src/index.js"]
