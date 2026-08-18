FROM node:22-bookworm-slim AS base
ENV COREPACK_HOME=/usr/local/share/corepack
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN mkdir -p "$COREPACK_HOME" \
  && corepack enable \
  && corepack prepare pnpm@10.34.5 --activate \
  && chmod -R a+rX "$COREPACK_HOME"
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/auth-contracts/package.json packages/auth-contracts/package.json
COPY packages/common/package.json packages/common/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/logger/package.json packages/logger/package.json
COPY packages/server-contracts/package.json packages/server-contracts/package.json
COPY packages/tsconfig packages/tsconfig
COPY services/server-service/package.json services/server-service/package.json
RUN pnpm install --frozen-lockfile --filter @linuxpilot/server-service...
COPY packages/auth-contracts packages/auth-contracts
COPY packages/common packages/common
COPY packages/config packages/config
COPY packages/logger packages/logger
COPY packages/server-contracts packages/server-contracts
COPY services/server-service services/server-service
RUN pnpm --filter @linuxpilot/server-service... build \
  && pnpm --filter @linuxpilot/server-service exec prisma generate \
  && mkdir -p /opt/prisma-generated \
  && cp -a /app/services/server-service/src/generated /opt/prisma-generated/generated

FROM build AS migrate
WORKDIR /app/services/server-service
ENV COREPACK_ENABLE_NETWORK=0
USER node
CMD ["/app/services/server-service/node_modules/.bin/prisma", "migrate", "deploy"]

FROM base AS runtime
ENV NODE_ENV=production
RUN useradd --system --uid 10001 --create-home --home-dir /home/linuxpilot linuxpilot
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/auth-contracts/package.json packages/auth-contracts/package.json
COPY packages/common/package.json packages/common/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/logger/package.json packages/logger/package.json
COPY packages/server-contracts/package.json packages/server-contracts/package.json
COPY packages/tsconfig packages/tsconfig
COPY services/server-service/package.json services/server-service/package.json
COPY --from=build /app/packages/auth-contracts/dist packages/auth-contracts/dist
COPY --from=build /app/packages/common/dist packages/common/dist
COPY --from=build /app/packages/config/dist packages/config/dist
COPY --from=build /app/packages/logger/dist packages/logger/dist
COPY --from=build /app/packages/server-contracts/dist packages/server-contracts/dist
COPY --from=build /app/services/server-service/dist services/server-service/dist
COPY --from=build /app/services/server-service/prisma services/server-service/prisma
COPY --from=build /opt/prisma-generated/generated services/server-service/src/generated
COPY --from=build /opt/prisma-generated/generated services/server-service/dist/generated
RUN pnpm install --frozen-lockfile --prod --filter @linuxpilot/server-service... \
  && chown -R linuxpilot:linuxpilot /app
WORKDIR /app/services/server-service
USER linuxpilot
EXPOSE 3002
HEALTHCHECK --interval=10s --timeout=5s --retries=10 --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3002/ready').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
