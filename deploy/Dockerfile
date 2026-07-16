FROM oven/bun:1.2-slim

WORKDIR /app

COPY package.json bun.lock ./
COPY api/package.json api/
COPY dashboard/package.json dashboard/
RUN bun install --production --filter api

COPY api api

WORKDIR /app/api

# comando definido no compose: server (api) ou worker
CMD ["bun", "run", "src/server.ts"]
