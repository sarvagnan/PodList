# PodList: the server, serving the API and the built web app on one origin.

FROM node:26-slim AS build
RUN npm install -g pnpm@12.18.0
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @podlist/web build

FROM node:26-slim
RUN npm install -g pnpm@12.18.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/domain packages/domain
COPY packages/api packages/api
COPY packages/server packages/server
COPY packages/web/package.json packages/web/package.json
# Workspace packages stay outside node_modules, where Node runs TypeScript directly.
RUN pnpm install --prod --frozen-lockfile --filter "@podlist/server..."
COPY --from=build /app/packages/web/dist packages/web/dist
RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production \
    PORT=8787 \
    DATABASE_PATH=/data/podlist.db \
    BACKUP_DIR=/data/backups \
    WEB_ROOT=/app/packages/web/dist
VOLUME /data
EXPOSE 8787
USER node
HEALTHCHECK --interval=60s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8787/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "packages/server/src/main.ts"]
