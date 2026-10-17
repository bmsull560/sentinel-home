# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:26-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install dependencies (including dev dependencies required for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build the application
RUN pnpm build

# Prune dev dependencies so the runner stage receives a production node_modules
RUN pnpm install --prod --frozen-lockfile

# ─── Production stage ────────────────────────────────────────────────────────
FROM node:26-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create a non-root user to run the application
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy production artifacts from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

# Ensure the non-root user can read application files
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Run migrations automatically before starting the server
CMD ["sh", "-c", "node scripts/migrate.js && node dist/index.js"]
