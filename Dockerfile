# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build the application
RUN pnpm build

# ─── Production stage ────────────────────────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy only production artifacts
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
COPY drizzle/ ./drizzle/
COPY dist/ ./dist/
COPY scripts/ ./scripts/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Run migrations automatically before starting the server
CMD ["sh", "-c", "pnpm db:migrate && pnpm start"]
