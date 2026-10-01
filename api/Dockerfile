# syntax=docker/dockerfile:1
# Build context: the repo root (npm workspaces share one lockfile).

FROM node:22-bookworm-slim AS build
WORKDIR /app
# better-sqlite3 may need to compile if no prebuilt binary matches.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --workspace api --include-workspace-root=false
COPY api api
RUN npm run build --workspace api \
    && npm prune --omit=dev --workspace api --include-workspace-root=false \
    && mkdir -p api/node_modules

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=3000 \
    UPLOADS_DIR=/data/uploads
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/api/node_modules ./api/node_modules
COPY --from=build /app/api/dist ./api/dist
COPY --from=build /app/api/package.json ./api/package.json
RUN mkdir -p /data && chown node:node /data
USER node
WORKDIR /app/api
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main"]
