# Incident: Google Places API Cost Climb from Bot Traffic (Jun 26, 2026)

## Summary

Google **Places API (New) "Nearby Search (Enterprise)"** spend climbed month over
month — €0.16 (June 2025) → €0.49 (Mar) → €1.29 (May) → €5.02 (June 2026) — tracking
toward the €10 budget. The driver was bot traffic, not real users: headless,
JS-executing crawlers (mostly Singapore and Japan) scrolled event pages, tripped the
`IntersectionObserver` gate on the "Where to eat" widget, and triggered
`GET /api/places/nearby` → one billable `searchNearby` request per cache miss. The
owner disabled the API by hand to stop the bleed.

The widget's scroll gate genuinely cut calls for humans (that's why May was only
€1.29), which is why it looked solved. It wasn't: the cache barely helped, and a bot
wave in June multiplied the misses.

## Impact

| | |
| --- | --- |
| Cost | ~€5 in June 2026 (would have passed the €10 budget alert; never a true cap) |
| Downtime | None |
| User impact | While the API was manually disabled, the widget showed a red "Failed to fetch places" error box on upcoming-event pages (now fixed to fail soft) |

The blast radius was always bounded: `SearchNearbyRequest` ships with a 100/day
default quota, so the worst case was ~100 calls/day ≈ €3/day. The €10 "budget" only
emails an alert — it never stops usage or billing.

## Timeline

- **Through June 2026** — Spend climbs with traffic; a bot wave (GA4: Singapore 13K /
  Japan 8.9K "users" vs Barcelona 1.6K, 11s avg engagement, 24K new / 400 returning)
  pushes June to €5.02.
- **Jun 26** — Owner disables the Places API in Google Cloud to stop the spend.
- **Jun 26** — Diagnosis: GA4 + Cloudflare edge analytics confirm bot origin;
  `/api/places/nearby` traffic is ~75% real ES users, ~25% JP bots, but the wider
  page-crawl is what multiplied misses. Three-layer fix shipped (PR #376) + edge +
  quota controls applied. API re-enabled behind the new quota cap.

## Root Cause

Two things made nearly every call a cache miss:

1. **The cache key was the exact lat/lng.** Two events ~200m apart never shared an
   entry, so the per-event widget re-queried Google for each one.
2. **The Next.js fetch cache is wiped every deploy.** `cache-handler.mjs` scopes keys
   by `buildId` (correct for prerender shells — see
   [2026-06-11](./2026-06-11-coolify-redis-stale-prerender.md)), so the Places
   results it cached were dropped on each deploy. On a frequently-deployed,
   bot-crawled site, the hit rate was near zero.

On Cloudflare's Free plan `/api/*` isn't edge-cached either, so nothing absorbed the
misses before they reached Google. `searchNearby` is billed **per request** (not per
result), so reducing the result limit 3→2 earlier had not reduced cost.

## Resolution

Defense in depth — no single layer is load-bearing:

1. **Origin (the real fix, PR #376)** — Cache the raw upstream result in Redis keyed
   by `~1.1km-snapped` coordinates, in a **deploy-independent** key (separate from the
   `buildId`-scoped Next handler). The Google request never depends on the event date
   (date handling is post-fetch), so one cached call serves a whole area across every
   date. 12h TTL. Calls now scale with distinct event areas (dozens/day), not traffic.
   Fail soft (200 + empty) on any upstream error. `lib/cache/redis-client.ts`,
   `lib/places/nearby-cache-key.ts`.
2. **Edge (Cloudflare WAF, not in the repo)** — Managed-challenge `www` traffic from
   SG/JP/CN (verified-bot-exempt via `cf.client.bot`, `www`-scoped so the origin's own
   API calls are untouched), plus a per-IP rate-limit on `/api/places/nearby`
   (15 req / 10s on Free).
3. **Provider (GCP, not in the repo)** — `places.googleapis.com/SearchNearbyRequest`
   daily quota capped at **50/day** via a Service Usage consumer override (default was
   100). This is the hard ceiling; a `429` stops calls and billing for the day.

## Prevention

1. **Coordinate-snapped, deploy-independent cache** — the structural fix: cost is now a
   function of distinct event locations, so a traffic or bot spike can't move it.
2. **Daily quota cap (50/day)** — a true hard ceiling. The €10 budget is an alert, not
   a cap; the quota is what bounds a runaway to one day instead of a month.
3. **Per-IP edge rate-limit** — the only control that catches direct random-coordinate
   abuse, which caching can't (random coords miss every time).
4. **Bundle baseline updated** — the redis client adds ~44KB to the `/api/places*`
   server bundles; `bundle-size-baseline.json` records it (thresholds unchanged).

## Lessons Learned

1. **A GCP "budget" is a smoke alarm, not a circuit breaker.** It emails; it never
   stops spend. The hard stop is an **API quota limit** (`SearchNearbyRequest`
   `/d/{project}`). Set the quota, not just the budget.
2. **Cache cost drivers by a coarse key, and keep that cache off the `buildId`-scoped
   handler.** Per-exact-coordinate keys + per-deploy eviction = a cache that doesn't
   cache. For data that should outlive deploys, use the app-level Redis client
   (`lib/cache/redis-client.ts`), not the Next incremental cache.
3. **`searchNearby` bills per request, not per result.** Lowering the result count
   does nothing for cost; lowering the *number of requests* (caching) is the lever.
4. **Never block DE / Hetzner / datacenter ASNs at the edge — that is the own origin.**
   ~40% of Cloudflare traffic is country=DE hitting `api.esdeveniments.cat`: the Coolify
   box on Hetzner (ASN 24940) calling its own backend on SSR. A disabled "block non-ES"
   WAF rule and a Cloudflare AI assistant both pointed at exactly this; applying it
   would take down SSR. Use *managed challenge* on named bot-source countries, never
   *block* by geography/ASN. Verify origin egress before any country/ASN edge rule.
5. **A widget's data fetch must fail soft.** A non-critical section returned a 500 that
   surfaced as a red error box to users when the upstream was unavailable. It now hides.
