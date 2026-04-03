FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN corepack enable && yarn install --immutable

FROM base AS builder
# Build-time arguments for Next.js static optimization.
# ARGs are scoped to the builder stage and do NOT persist in the final runner image.
# NEXT_PUBLIC_* vars are inlined at build time by Next.js.
# HMAC_SECRET is needed for ISR static generation (API route HMAC signing).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG HMAC_SECRET
ARG SENTRY_AUTH_TOKEN
ARG BUILD_VERSION
# Use ENV so child processes (yarn build) inherit the values.
# These ENVs only exist in the builder stage, not the final runner stage.
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    HMAC_SECRET=$HMAC_SECRET \
    SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
    BUILD_VERSION=$BUILD_VERSION

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && yarn prebuild && yarn build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/cache-handler.mjs ./cache-handler.mjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

USER nextjs

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
