# Incident: Coolify Redis Stale Prerender Drops SSR Metadata (Jun 11, 2026)

## Summary

Self-hosted (Coolify) deployments on the `develop` line — `staging.esdeveniments.cat` and every `pr-*.esdeveniments.cat` preview — served pages whose raw server HTML had no `<title>`, no meta description, and no canonical link. Pages returned HTTP 200 and rendered for users (the browser set the title client-side), but crawlers saw a metadata-less document. Runtime logs showed `Expected the resume to render <lk> in this slot but instead it rendered <lN>. The tree doesn't match so React will fallback to client rendering`. localhost and Vercel were unaffected.

This is the same failure *family* as [2026-04-23 Coolify PR Preview Empty HTML](./2026-04-23-coolify-pr-preview-empty-html.md) — SSR content/metadata missing only on self-hosted, invisible to a status-code check — but a different root cause. That earlier report recommended "adding a health check to PR preview CI that verifies `<h1>` tags exist." It was never built, so the pattern recurred.

## Impact

| Env | `<title>` in server HTML | Cause |
| --- | --- | --- |
| prod (`www`, main) | present | main had the fix |
| staging (develop) | **missing** | stale Redis prerender |
| pr-* previews (develop) | **missing** | stale Redis prerender |
| localhost / Vercel | present | Redis handler not used |

SEO-critical: any develop→main promotion would have shipped a site with no server-rendered title/description/canonical. No downtime; degraded crawlability on the develop line until fixed.

## Timeline

- **May 2, 2026** — `097e1275 fix(cache): scope Redis entries by build id` lands on **main**. Never back-merged to develop.
- **May 12, 2026** — PR #300 gates the Redis `cacheHandler` to self-hosted only (`isVercel ? {} : { cacheHandler }`).
- **Jun 11, 2026** — Missing-image incident investigation surfaces that staging/pr previews render no `<title>`. Diagnosed via Coolify MCP (deployment + runtime logs).
- **Jun 11, 2026** — Build-id scoping ported to the fix branch; pr-339 redeployed; `<title>` restored.

## Root Cause

`cache-handler.mjs` on develop used a fixed Redis key prefix, `next:cache:`. Redis persists across deploys. With one prefix, a new build read prerendered RSC shells written by the **previous** build. The new build's component tree no longer matched that cached shell, so React's resume failed (`Expected the resume to render ...`), discarded the prerender, and fell back to client rendering — which emits HTML without the server-rendered `<head>` metadata.

Why only self-hosted: PR #300 enables the Redis `cacheHandler` only off-Vercel. localhost dev and Vercel never use it (in-memory LRU / no handler), so they have no cross-build persistence to go stale.

The deeper cause is process, not code: a fix existed on **main** and was never propagated to **develop**. The cache bug was the thing that fell through that gap.

## Resolution

Port `097e1275` to develop — scope the key prefix by `buildId` (`next:cache:${buildId}:`) so every build gets a fresh namespace and cannot read a prior build's shell. Verified the handler is now byte-identical in logic to main's working version. Redeploying pr-339 restored server-rendered metadata. Old `next:cache:` entries orphan harmlessly and age out.

## Prevention

1. **Branch-drift guard** (`.github/workflows/branch-drift.yml`) — flags when main is ahead of develop on infra-critical files (`cache-handler.mjs`, `next.config.js`, `Dockerfile`, `proxy.ts`). Directly targets the root cause.
2. **Post-deploy SSR-metadata monitor** (`.github/workflows/uptime.yml`) — asserts `<title>`, meta description, and canonical exist in the raw prod HTML. The only automated layer that runs against persistent Redis across real deploys, so the only one that catches this symptom. This is the check the April incident asked for.
3. **Pending — move the merge gate onto prod architecture** — build the Docker image in CI with a throwaway Redis and smoke-test it, or gate develop→main on Coolify staging health. Ends the recurring "green on Vercel, broken on Coolify" pattern (this incident, the April empty-HTML incident, the Feb Sharp incident).

## Lessons Learned

1. **A hotfix on main must be back-merged to develop the same day.** Branch divergence on infra files is how a fixed bug re-ships.
2. **The cache handler is self-hosted-only.** Anything touching it cannot be validated on Vercel or localhost — it needs a real Redis + a production build across two deploys.
3. **HTTP 200 is not "the page works."** Assert SSR metadata in the raw HTML; a resume fallback returns 200 with an empty head.
4. **We already knew.** The April incident named this exact prevention and we didn't build it. A prevention item in a post-mortem is not done until it is code in CI.
