FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
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
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_GOOGLE_ANALYTICS
ARG NEXT_PUBLIC_GOOGLE_ADS
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ARG NEXT_PUBLIC_GOOGLE_MAPS
ARG NEXT_PUBLIC_TIKTOK_CLIENT_KEY
ARG NEXT_PUBLIC_TIKTOK_REDIRECT_URI
ARG NEXT_PUBLIC_CONTACT_EMAIL
# Web Push: public VAPID key is inlined into the client bundle at build time.
# Without it, usePushNotifications reports "unsupported" and the push CTA
# never renders in production.
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG HMAC_SECRET
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG BUILD_VERSION
# Use ENV so child processes (yarn build) inherit the values.
# These ENVs only exist in the builder stage, not the final runner stage.
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_GOOGLE_ANALYTICS=$NEXT_PUBLIC_GOOGLE_ANALYTICS \
    NEXT_PUBLIC_GOOGLE_ADS=$NEXT_PUBLIC_GOOGLE_ADS \
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION \
    NEXT_PUBLIC_GOOGLE_MAPS=$NEXT_PUBLIC_GOOGLE_MAPS \
    NEXT_PUBLIC_TIKTOK_CLIENT_KEY=$NEXT_PUBLIC_TIKTOK_CLIENT_KEY \
    NEXT_PUBLIC_TIKTOK_REDIRECT_URI=$NEXT_PUBLIC_TIKTOK_REDIRECT_URI \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    HMAC_SECRET=$HMAC_SECRET \
    SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
    SENTRY_ORG=$SENTRY_ORG \
    SENTRY_PROJECT=$SENTRY_PROJECT \
    BUILD_VERSION=$BUILD_VERSION

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && yarn prebuild && yarn build

FROM base AS runner
ENV NODE_ENV=production
# Re-declare BUILD_VERSION ARG to pass it from builder to runner stage.
# This is the only non-secret value that needs to persist in the final image.
ARG BUILD_VERSION
ENV BUILD_VERSION=$BUILD_VERSION
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/cache-handler.mjs ./cache-handler.mjs
# Entrypoint caps V8's heap to a fraction of the container memory limit so the
# GC runs before the kernel OOM-kills the container (see docker-entrypoint.sh).
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

USER nextjs

# Timeout was 3s — too tight for a Node.js app under GC pressure. Under
# memory stress the event loop stalls and /api/health can't respond within 3s
# even though the process is alive, triggering false-unhealthy restarts.
# 10s gives GC headroom; start-period 40s covers cold-start (entrypoint heap
# sizing + 0-byte image cache cleanup + Redis connect). The stale-cache purge
# runs fire-and-forget after Redis connects (cache-handler.mjs) and isn't a
# readiness gate, so it isn't counted here. See incident 2026-07-07.
# The internal AbortController fires at 9500ms, just under Docker's own 10s
# --timeout: Docker kills the whole probe process at 10s regardless, so an
# internal abort tighter than that (the previous value here was 8000ms)
# silently shrinks the documented 10s tolerance down to whatever the internal
# value is — losing exactly the GC-pause headroom this timeout was raised to
# provide. 9500ms leaves 500ms for the abort handler and process.exit() to
# actually run before Docker's own kill would fire.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const c=new AbortController(),t=setTimeout(()=>c.abort(),9500);fetch('http://127.0.0.1:3000/api/health',{signal:c.signal}).then(r=>{clearTimeout(t);process.exit(r.ok?0:1)}).catch(()=>{clearTimeout(t);process.exit(1)})"

CMD ["./docker-entrypoint.sh"]
