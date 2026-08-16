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
COPY packages/tsconfig packages/tsconfig
COPY services/auth-service/package.json services/auth-service/package.json
RUN pnpm install --frozen-lockfile --filter @linuxpilot/auth-service...
COPY packages/auth-contracts packages/auth-contracts
COPY packages/common packages/common
COPY packages/config packages/config
COPY packages/logger packages/logger
COPY services/auth-service services/auth-service
RUN pnpm --filter @linuxpilot/auth-service... build \
  && pnpm --filter @linuxpilot/auth-service exec prisma generate \
  && mkdir -p /opt/prisma-generated \
  && CLIENT_DIR="$(find /app/node_modules/.pnpm -type d -path '*/node_modules/@prisma/client' | head -1)" \
  && PRISMA_DIR="$(find /app/node_modules/.pnpm -type d -path '*/node_modules/.prisma' | head -1)" \
  && test -n "$CLIENT_DIR" && test -n "$PRISMA_DIR" \
  && cp -a "$CLIENT_DIR" /opt/prisma-generated/client \
  && cp -a "$PRISMA_DIR" /opt/prisma-generated/.prisma

FROM build AS migrate
WORKDIR /app/services/auth-service
ENV COREPACK_ENABLE_NETWORK=0
USER node
CMD ["/app/services/auth-service/node_modules/.bin/prisma", "migrate", "deploy"]

FROM base AS runtime
ENV NODE_ENV=production
RUN useradd --system --uid 10001 --create-home --home-dir /home/linuxpilot linuxpilot
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/auth-contracts/package.json packages/auth-contracts/package.json
COPY packages/common/package.json packages/common/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/logger/package.json packages/logger/package.json
COPY packages/tsconfig packages/tsconfig
COPY services/auth-service/package.json services/auth-service/package.json
COPY --from=build /app/packages/auth-contracts/dist packages/auth-contracts/dist
COPY --from=build /app/packages/common/dist packages/common/dist
COPY --from=build /app/packages/config/dist packages/config/dist
COPY --from=build /app/packages/logger/dist packages/logger/dist
COPY --from=build /app/services/auth-service/dist services/auth-service/dist
COPY --from=build /app/services/auth-service/prisma services/auth-service/prisma
COPY --from=build /opt/prisma-generated /opt/prisma-generated
RUN pnpm install --frozen-lockfile --prod --filter @linuxpilot/auth-service... \
  && TARGET="$(find /app/node_modules/.pnpm -type d -path '*/@prisma+client@*/node_modules' | head -1)" \
  && test -n "$TARGET" \
  && rm -rf "$TARGET/@prisma/client" "$TARGET/.prisma" \
  && cp -a /opt/prisma-generated/client "$TARGET/@prisma/client" \
  && cp -a /opt/prisma-generated/.prisma "$TARGET/.prisma" \
  && chown -R linuxpilot:linuxpilot /app
WORKDIR /app/services/auth-service
USER linuxpilot
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --retries=10 --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
