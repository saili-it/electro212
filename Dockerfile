# syntax=docker/dockerfile:1

# ---- Builder: install deps, generate Prisma client, build Next ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL is normally NOT needed at build time (the sitemap falls back
# gracefully and all page data is fetched at runtime). Kept as an optional ARG
# in case a future build step needs it.
ARG DATABASE_URL=""
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
