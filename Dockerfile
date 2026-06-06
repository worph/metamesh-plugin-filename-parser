# MetaMesh Plugin: filename-parser
# Parses video filenames to extract metadata

FROM node:20-slim AS builder

# Install git for GitHub dependencies
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack@latest && corepack enable

WORKDIR /app

# Copy package files first for layer caching. vendor/ holds the locally-built
# @metazla/filename-tools tarball (file: dep) — replaces github:worph/filename-tool
# so local lib changes ship without a GitHub push. The tarball is pre-built
# (dist/ included), so no in-place rebuild step is needed. --no-frozen-lockfile
# because the committed lockfile still pins the old github tarball; pnpm
# reconciles it to the file: dep at build time.
COPY package.json pnpm-lock.yaml ./
COPY vendor/ ./vendor/
RUN corepack install
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --no-frozen-lockfile

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm run build

# Production image
FROM node:20-slim

# Install git for GitHub dependencies
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack@latest && corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY vendor/ ./vendor/
RUN corepack install
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --no-frozen-lockfile --prod

COPY --from=builder /app/dist ./dist

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.js"]
