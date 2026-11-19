# ==============================================================================
# Production Multi-Stage Dockerfile for Unified Books, Admin & Public Bot Platform
# Node 24 is required for Native SQLite (node:sqlite DatabaseSync)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build client bundles and server binary
# ------------------------------------------------------------------------------
FROM node:24-slim AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all build dependencies
RUN npm install --legacy-peer-deps

# Copy full application source code
COPY . .

# Build Vite client bundles (index.html, bot.html, chat.html) + bundle server.ts via esbuild
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Server Runtime
# ------------------------------------------------------------------------------
FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3002 \
    PLATFORM_DATA_DIR=/app/data

# Create dedicated non-root system user and group
RUN groupadd -r nodejs --gid 1001 && \
    useradd -r -g nodejs --uid 1001 nodejs

# Copy package manifests and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy compiled distribution output from builder stage
COPY --from=builder /app/dist ./dist

# Create persistent storage directories with proper ownership
RUN mkdir -p /app/data/audio /mnt/waraqa && \
    chown -R nodejs:nodejs /app/data

# Declare persistent volume for SQLite platform.db and voice recordings
VOLUME ["/app/data"]

USER nodejs

EXPOSE 3002

# Internal health probe
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3002/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/server.cjs"]
