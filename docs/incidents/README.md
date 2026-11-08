# Incident Reports

This folder contains post-mortem reports for significant production incidents. The goal is to document root causes, impact, and prevention measures to avoid repeating the same mistakes.

## Report Format

Each incident report should include:

1. **Summary** - Brief description of what happened
2. **Impact** - Cost, downtime, user impact
3. **Timeline** - When detected, when resolved
4. **Root Cause** - Technical explanation of why it happened
5. **Resolution** - What was done to fix it
6. **Prevention** - Measures added to prevent recurrence
7. **Lessons Learned** - Key takeaways

## Naming Convention

Files are named: `YYYY-MM-DD-short-description.md`

## Index

Reports marked *(in git)* were removed from the tree; read them with
`git show ad044ed6^:docs/incidents/<file>`.

| Date       | Incident | Impact | Status |
| ---------- | -------- | ------ | ------ |
| 2026-11-08 | [Cloudflare Cached a 404 for a New JS Chunk After Deploy](./2026-11-08-cloudflare-cached-chunk-404.md) | Downtime (~27 min, unstyled dead pages) | Resolved (Cloudflare status-code TTL pending) |
| 2026-08-18 | [Cloudflare Zaraz fires production Google tags on staging and Coolify](./2026-08-18-zaraz-zone-wide-google-tags.md) | Analytics (polluted GA4 data) | Open (manual Zaraz fix) |
| 2026-07-26 | [PR Review Loop Missed 12 of 13 Threads on PR #426](./2026-07-26-pr-review-loop-missed-threads.md) | Process (would have shipped 2 P1 regressions) | Resolved (Documented) |
| 2026-07-07 | [Production Container Crash-Loop from Healthcheck Timeout](./2026-07-07-coolify-container-healthcheck-crash.md) | Downtime (~21h, manual recovery) | Resolved |
| 2026-06-26 | [Google Places API Cost Climb from Bot Traffic](./2026-06-26-places-api-cost.md) | Cost (~€5/mo, bot-driven) | Resolved |
| 2026-06-13 | [cacheComponents Metadata Resume Mismatch + Oversized Cache Tag](./2026-06-13-cachecomponents-metadata-resume-mismatch.md) | SSR fallback to client rendering, failed cache tags | Resolved |
| 2026-06-11 | [Coolify Redis Stale Prerender Drops SSR Metadata](./2026-06-11-coolify-redis-stale-prerender.md) | SEO (no SSR title/canonical) | Resolved |
| 2026-04-25 | [Orank Empty Shell Non-Issue](./2026-04-25-orank-empty-shell-non-issue.md) | None — diagnostic only | Resolved (Documented) |
| 2026-04-24 | [AI Bot UA and Browser PPR Shell Share the Same CDN Cache](./2026-04-24-ai-bot-cdn-cache-mix.md) | AI crawlers saw an empty shell | Resolved |
| 2026-04-23 | [Coolify PR Preview Empty HTML](./2026-04-23-coolify-pr-preview-empty-html.md) | SEO testing unreliable on PR previews | Resolved (Documented) |
| 2026-04-04 | [Cloudflare RSC Cache Poisoning](./2026-04-04-cloudflare-rsc-cache-poisoning.md) | `/es` served raw RSC payload (~30 min) | Resolved |
| 2026-02-18 | Sharp Architecture Mismatch *(in git: `2026-02-18-sharp-architecture-mismatch.md`)* | Performance (4 days unoptimized images) | Resolved |
| 2026-01-20 | Fetch Cache Explosion *(in git: `2026-01-20-fetch-cache-explosion.md`)* | Cost | Resolved |
| 2025-12-28 | DynamoDB Write Cost Spike *(in git: `2025-12-28-dynamodb-write-cost-spike.md`)* | $307.50 | Resolved |
| 2025-12-23 | robots.txt Routing Issues *(in git: `2025-12-23-robots-txt-routing-issues.md`)* | SEO | Resolved (Workaround) |
