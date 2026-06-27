# Stage 1 – build
FROM node:22-alpine AS build

# Run install/build steps as root. Required for rootless Podman, where the
# container defaults to a non-root uid and corepack cannot create symlinks in
# the root-owned /usr/local/bin (EACCES). Docker builds as root by default.
USER root

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/cli/package.json packages/cli/
COPY packages/mcp-server/package.json packages/mcp-server/
COPY packages/content-loader/package.json packages/content-loader/

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Stage 2 – runtime
FROM node:22-alpine AS runtime

# Same as build stage: corepack needs root to write its symlinks under
# /usr/local/bin (rootless Podman defaults to a non-root uid). We switch to the
# unprivileged `node` user further down, before the ENTRYPOINT.
USER root

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/cli/package.json packages/cli/
COPY packages/mcp-server/package.json packages/mcp-server/
COPY packages/content-loader/package.json packages/content-loader/

RUN pnpm install --frozen-lockfile --production --ignore-scripts

COPY --from=build /app/packages/core/dist packages/core/dist
COPY --from=build /app/packages/cli/dist packages/cli/dist
COPY --from=build /app/packages/mcp-server/dist packages/mcp-server/dist
COPY --from=build /app/packages/content-loader/dist packages/content-loader/dist

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Mount point for host data
WORKDIR /knowledge

USER node

ENTRYPOINT ["docker-entrypoint.sh"]
