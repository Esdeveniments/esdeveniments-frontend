# Incident: Cloudflare Zaraz fires production Google tags on staging and the Coolify dashboard (Aug 18, 2026)

> **Status: OPEN** — the Cloudflare Zaraz remediation (resolution step 1) is a pending manual action outside this PR. The staging E2E guard stays red until it lands and the staging image is redeployed; that red is the alarm, not a false positive.

## Summary

The production GA4 property (`G-1F86ZBKSJ0`) showed sessions attributed to `staging.esdeveniments.cat` and to the Coolify dashboard host (`coolify.esdeveniments.cat`), plus intermittent Google Ads signals. The app's own analytics code was *not* the source: `app/GoogleScripts.tsx` correctly gates gtag/Ads to the production host (www + apex allowlist, fix #374, June 26) and the deployed staging bundle provably contains that gating. The leak was **Cloudflare Zaraz** — the zone's edge tag manager — which is injected into **every hostname in the zone** and carries a Google Analytics 4 integration configured with the **production** measurement ID. Zaraz ran on staging and on the Coolify dashboard itself, sending Google pings (`stats.g.doubleclick.net/g/collect?t=dc&tid=G-1F86ZBKSJ0`) that the app-level host gating cannot stop.

## Impact

| Host | App gtag (host-gated) | Zaraz injection | Google pings observed |
| --- | --- | --- | --- |
| `www.esdeveniments.cat` / apex | ✅ full GA4 hits (expected) | ✅ | `t=dc` + full pageviews |
| `staging.esdeveniments.cat` | ❌ correctly suppressed | ✅ **unexpected** | `t=dc` with prod GA4 ID, fundingchoices CMP |
| `coolify.esdeveniments.cat` (dashboard) | n/a (not the app) | ✅ **unexpected** | `t=dc` with prod GA4 ID |
| PR previews / any zone host | ❌ suppressed | ✅ | same class |

Effect: staging and dashboard traffic (and consent-granted full events forwarded via Zaraz's edge endpoint) polluted the production GA4 property and Ads linking; "sometimes Google Ads" noise came from these Zaraz pings plus the legitimately linked Ads account.

## Root Cause

Two layers combined:

1. **Cloudflare Zaraz is enabled zone-wide** with a Google Analytics 4 integration using `G-1F86ZBKSJ0` and a zone-level Pageview trigger. Zaraz injects `<script src="/cdn-cgi/zaraz/s.js">` into every HTML response in the zone — including staging and the Coolify dashboard, which resolve through the same zone. It runs at the CDN edge, **outside the app**, so `isProductionHost` gating in the app cannot constrain it. Evidence: live DOM on both hosts showed the Zaraz loader + `zarazData.executed = ["Pageview"]` + a registered `google-analytics_v4` listener; both sent the `t=dc` beacon carrying the prod GA4 ID.
2. **Staging builds inherited the prod tracking IDs at build time.** The `staging` GitHub environment had no `NEXT_PUBLIC_GOOGLE_ANALYTICS` / `NEXT_PUBLIC_GOOGLE_ADS`, so `${{ secrets.* }}` fell back to the **repo-level** (prod) values. The deployed staging bundle literally contains `G-1F86ZBKSJ0` and `ca-pub-2456713018173238` (verified by grepping the served chunks), which also loads the Funding Choices CMP on staging.

Plus a permanent attribution effect (not a leak): sessions arriving at production *from* staging or the Coolify dashboard show in GA4 as `staging.esdeveniments.cat / referral` / `coolify.esdeveniments.cat / referral`.

## Resolution

1. **Cloudflare → Zaraz (zone `esdeveniments.cat`)** — **PENDING (manual, outside this PR):** remove the GA4 (and any Google Ads) integration from Zaraz, or restrict its triggers to `www.esdeveniments.cat` + `esdeveniments.cat`. The app implements GA4 + Ads + Consent Mode v2 natively; Zaraz's copy is redundant and is the leak. Update this doc with the completion date once done.
2. **GitHub** — `NEXT_PUBLIC_GOOGLE_ANALYTICS` / `NEXT_PUBLIC_GOOGLE_ADS` set to **empty** on the `staging` environment (Aug 18), so staging builds stop baking prod IDs. A CI guard ("Blank Google tracking IDs for non-prod builds" in `deploy-coolify.yml`) now blanks both IDs on any non-main build and warns if it caught a non-empty value — deterministic regardless of GitHub's empty-secret precedence semantics.
3. **Guardrail** — new E2E spec `e2e/no-google-tracking-on-non-prod.spec.ts` asserts zero Google tracking requests on the home page of the configured non-prod base URL (single-route smoke; PR CI runs it against localhost). A dedicated nightly workflow (`.github/workflows/no-google-tracking.yml`) runs it against the deployed staging host — the one place zone-wide Zaraz injection actually occurs. It fails today (that's the point) and goes green once Zaraz is fixed and the staging image is redeployed.

## Prevention

1. **E2E no-Google-requests guard** (merged with this incident) — catches edge-injected trackers the app cannot see; run nightly against the deployed staging host, not just localhost.
2. **CI blanking step** — non-prod images can never bake prod tracking IDs, even if environment secrets drift.
3. **Recommended GA4 data filter** — exclude `staging.*` / `coolify.*` (and `pr-*`) hostnames as the property-level defense in depth. Apply it *after* the Zaraz fix is confirmed by the nightly guard going green — while the leak is live you still want staging traffic visible so you can verify it stopped.
4. **Rejected: `ga-dashboard.py` `hostName` alert** — considered and declined. It is redundant with the E2E guard (same leak, caught deterministically at the source) and would go permanently blind the moment the GA4 data filter above is applied. It also cannot reliably detect the `t=dc` cookieless pings that are the actual mechanism, since those do not carry `page_location`. Detection lives in the nightly E2E; cleanup lives in the GA4 filter.

## Lessons Learned

1. **Anything that runs at the CDN/zone level (Zaraz, Workers, edge injections) bypasses app-level host gating.** When diagnosing "foreign traffic in GA", check what Cloudflare injects — the app may be innocent.
2. **`${{ secrets.X }}` falls back to repo-level values when an environment doesn't define the secret.** Empty environment secrets are the explicit signal; better, don't rely on it — branch-gate in the workflow.
3. **Probe deployed bundles, not just source**: the deployed staging chunk contained the gating *and* the prod IDs; only a live browser run (or a request-listening test) surfaces what actually fires on the page.
4. **Consent cookies are shared across subdomains** (apex-scoped), so a user who consented on production is consent-granted on staging/Coolify — "sometimes" leaks are often consent-state dependent.
