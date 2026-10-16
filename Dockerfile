# syntax=docker/dockerfile:1

# ---- Builder: install deps, generate Prisma client, build Next ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# prisma.config.ts resolves env("DATABASE_URL") when the Prisma CLI loads it, so
# a syntactically-valid value must exist at build time. This placeholder is
# never used to connect: `prisma generate` only reads the schema, and
# `next build` never queries the DB (the sitemap falls back gracefully). The
# real DATABASE_URL is injected at runtime by docker compose.
ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/placeholder?schema=public"
ENV DATABASE_URL=$DATABASE_URL

# Install dependencies first (layer cached until the lockfile changes).
COPY package.json package-lock.json ./
RUN npm ci

# Build.
COPY . .
RUN npx prisma generate && npm run build

# ---- Runner: run the built app (keeps node_modules so `prisma migrate deploy` works) ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Uploaded files (local storage adapter) live here; mount a volume on it.
RUN mkdir -p /app/.data/uploads

COPY --from=builder /app ./

EXPOSE 3000

# Apply pending migrations, then start the production server.
CMD ["sh", "-c", "npx prisma migrate deploy && node_modules/.bin/next start -H 0.0.0.0 -p 3000"]
