# syntax=docker/dockerfile:1

# ---- Base ----
FROM node:22-alpine AS base
# Prisma needs openssl; libc6-compat helps native deps on alpine.
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# ---- Dependencies (all, incl. dev — needed for build, prisma, seed) ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- Builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# Dummy values so `next build` doesn't fail on missing env at build time.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runner (slim runtime image) ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next.js standalone server output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Ensure the Prisma query engine + generated client are present at runtime
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
