# ============================================================
# Leapfour Pipeline — Multi-stage Dockerfile with layer caching
# ============================================================
# Layer order (top = changes least):
#   1. Base + system deps        → almost never changes
#   2. package.json + npm ci     → only when deps change
#   3. Prisma schema + generate  → only when schema changes
#   4. Source code + next build  → every deploy
#
# Typical code-only deploy: ~30-60s (skips layers 1-3)
# ============================================================

# ----- Stage 1: Dependencies -----
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ----- Stage 2: Prisma Generate -----
FROM node:20-alpine AS prisma
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY package.json prisma.config.ts ./
COPY prisma ./prisma
RUN npx prisma generate

# ----- Stage 3: Build -----
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=prisma /app/node_modules ./node_modules
COPY package.json next.config.mjs tsconfig.json tailwind.config.ts postcss.config.mjs components.json ./
COPY src ./src
COPY --from=prisma /app/src/generated ./src/generated
COPY prisma ./prisma
COPY public ./public

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Dummy env vars for build (Next.js validates them at build, values don't matter)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV NEXTAUTH_SECRET="build-time-dummy-secret"

RUN npm run build

# ----- Stage 4: Production Runtime -----
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

COPY docker-start.sh ./
RUN chmod +x docker-start.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-start.sh"]
