FROM node:22-bookworm-slim AS base
ENV COREPACK_HOME=/usr/local/share/corepack
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
COPY gateway/api-gateway/package.json gateway/api-gateway/package.json
RUN pnpm install --frozen-lockfile --filter @linuxpilot/api-gateway...
COPY packages/auth-contracts packages/auth-contracts
COPY packages/common packages/common
COPY packages/config packages/config
COPY packages/logger packages/logger
COPY gateway/api-gateway gateway/api-gateway
RUN pnpm --filter @linuxpilot/api-gateway... build

FROM base AS runtime
ENV NODE_ENV=production
RUN useradd --system --uid 10001 --create-home --home-dir /home/linuxpilot linuxpilot
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/auth-contracts/package.json packages/auth-contracts/package.json
COPY packages/common/package.json packages/common/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/logger/package.json packages/logger/package.json
COPY packages/tsconfig packages/tsconfig
COPY gateway/api-gateway/package.json gateway/api-gateway/package.json
COPY --from=build /app/packages/auth-contracts/dist packages/auth-contracts/dist
COPY --from=build /app/packages/common/dist packages/common/dist
COPY --from=build /app/packages/config/dist packages/config/dist
COPY --from=build /app/packages/logger/dist packages/logger/dist
COPY --from=build /app/gateway/api-gateway/dist gateway/api-gateway/dist
RUN pnpm install --frozen-lockfile --prod --filter @linuxpilot/api-gateway... \
  && chown -R linuxpilot:linuxpilot /app
WORKDIR /app/gateway/api-gateway
USER linuxpilot
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --retries=10 --start-period=15s \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
