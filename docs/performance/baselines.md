# Performance baselines

Add a new dated section each time you measure. Keep the old sections, so trends stay visible.

## What we track, and Google's limits

Google ranks with the **Core Web Vitals** of real Chrome users (CrUX, "field"), at the **75th percentile**, separately for phone and desktop. A page passes when all three are "good". Source: [web.dev/vitals](https://web.dev/articles/vitals), [thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds).

| Metric | What it measures | Good | Poor | Our target |
|---|---|---|---|---|
| **LCP** | time until the main content shows | ≤ 2.5 s | > 4.0 s | < 1.5 s |
| **INP** | reaction to a tap or click | ≤ 200 ms | > 500 ms | < 150 ms |
| **CLS** | how much the layout jumps | ≤ 0.1 | > 0.25 | < 0.05 |
| FCP (supporting) | first paint | ≤ 1.8 s | > 3.0 s | |
| TTFB (supporting) | first byte from the server | ≤ 0.8 s | > 1.8 s | |

Google has no "excellent" level, only good / needs improvement / poor. Our targets are tighter than "good", so we lead the events space (see the competitor table below).

Lab numbers (this machine, `scripts/perf-lab.mjs`) are proxies. They explain why the field numbers move, but only CrUX counts for Google:

- TBT (blocking JavaScript) is the lab proxy for INP.
- HTML size and domInteractive (page ready) drive LCP on slow phones.
- Field CLS can come from ads that the lab never shows (see 2026-11-02).

## How to measure

- **Field (production):** `python3 scripts/crux-check.py`. It needs a free CrUX API key. Data covers the last 28 days, so a change needs about 4 weeks to show fully. Single pages have too few visits; only the whole site has data.
- **Google scripts on production:** `node scripts/perf-google-tbt.mjs https://www.esdeveniments.cat 5 <out.json> <path>...` splits blocking time by script (gtag.js, Funding Choices, ours), with variants that block each one. `node scripts/perf-stream.mjs '<url>?nc=NC' 7` times when the LCP image and h1 bytes arrive (`NC` skips Cloudflare).
- **Redis:** `curl -s "https://www.esdeveniments.cat/api/health?secret=$REVALIDATE_SECRET" | jq .cache.redis`.
- **Lab:** build each version with `E2E_TEST_MODE=1 NEXT_PUBLIC_E2E_TEST_MODE=1 yarn build`, start it with `INTERNAL_SITE_URL=http://localhost:<port> E2E_TEST_MODE=1 yarn start -p <port>`, then `node scripts/perf-lab.mjs http://localhost:<port> <label> <out.json> / /catalunya /barcelona /e/<slug>`.
  - Measure all versions in the same session, with the same API and the same event slugs.
  - E2E mode turns off Google scripts (consent box, ads, analytics), so lab LCP never includes the consent box.
  - Never run `next dev` for this (it froze this Mac twice).

## 2026-11-02: perf work #594-#605

**Versions:**
- "before" = develop `1ee9aa30`
- "now" = develop `6b1e1bf1` (after #594-#605)
- "live" = www.esdeveniments.cat (main), measured with the same script. It includes the Google scripts, so it is a reference, not a 1:1 comparison.

A local build of main could not be used: main still uses backend contract v1, so against the v2 test API its event pages render as 404 and its listings are empty.

Lab: Pixel 7, 4x CPU, 1.6 Mbps / 150 ms, median of 3. HTML is raw (uncompressed) size; total is transferred (compressed) bytes for the HTML plus all resources.

| Page | Metric | Live | Before | Now |
|---|---|---|---|---|
| `/` | LCP | 3.37 s (hero image) | 1.95 s | **1.27 s** |
| | FCP / TBT | 3.37 s / 95 ms | 0.65 s / 44 ms | 0.67 s / 48 ms |
| | domInteractive | 2.60 s | 3.19 s | 3.04 s |
| | HTML / total | 1317 / 812 KB | 864 / 584 KB | **722** / 564 KB |
| `/catalunya` | LCP | 3.23 s (image) | 2.08 s | **0.88 s** |
| | TBT | 136 ms | 48 ms | 48 ms |
| | domInteractive | 2.01 s | 2.92 s | 2.28 s |
| | HTML / total | 959 / 905 KB | 976 / 638 KB | **579** / 594 KB |
| `/barcelona` * | LCP | 6.04 s (consent box) | 1.73 s | **1.18 s** |
| | domInteractive | 2.03 s | 1.70 s | 1.20 s |
| | HTML | 980 KB | 432 KB | 327 KB |
| Event with image | LCP | 2.53 s (image) | 3.05 s | 3.00 s |
| | domInteractive | 1.21 s | 2.04 s | **1.30 s** |
| | HTML / total | 448 / 985 KB | 493 / 747 KB | **375** / 731 KB |
| Event without image | LCP | 7.11 s (consent box) | 0.62 s | 0.60 s |
| | domInteractive | 1.19 s | 1.85 s | **1.28 s** |
| | HTML | 455 KB | 474 KB | **358** KB |

\* The test API has fewer Barcelona events than production, so the local page is smaller than the live one.

- CLS: 0 to 0.01 on every page, in every version.
- JavaScript: 311-346 KB locally, 509-689 KB live. Part of the live amount is Google's scripts.

**Field (CrUX, production, phone, p75):**

| | 2026-05-16 | 2026-08-08 | 2026-10-31 |
|---|---|---|---|
| LCP | 2.39 s | 2.51 s | 2.58 s (73% good) |
| INP | 202 ms | 203 ms | 189 ms (80% good) |
| CLS | 0.02 | 0.05 | 0.28 (71% good) |

FCP 1.27 s (89% good), TTFB 0.53 s (89% good).

**Competitors (CrUX phone, October 2026, LCP / INP / CLS):**
- gencat agenda: 4.67 s / 318 ms / 0.00
- festacatalunya: 3.60 s / 133 ms / 0.05
- eventbrite.es: 2.97 s / 303 ms / 0.08
- timeout.cat: 1.15 s / 259 ms / 0.07
- vilaweb: 1.32 s / 111 ms / 0.01

**Findings:**
- Field CLS 0.28 comes from the AdSense Auto ads "Banner ads" experiment (2026-07-08). It put a 432 px banner after the event breadcrumb, for returning visitors. Banner ads were turned off on 2026-11-01; the lab CLS on event pages went from 0.46-0.55 to 0. Expect the field value to fall over 4 weeks.
- On a first visit, the live LCP is often the Google consent box text (6-7 s on a slow phone). It is the main open LCP problem and is not in the lab numbers.
- Event pages with an image stay at about 3 s LCP: the image download is the limit.
- TBT went up a little (40-47 ms before, 46-56 ms now). It is still low.
- ISR on event pages (#605) cannot be measured on this machine, because the server renders in about 30 ms anyway. On staging (no Cloudflare cache), full-HTML median was 0.72 s on the first visit vs 0.53 s on a repeat visit, but there is no same-method "before". Check production after release: Cloudflare served only 15% of Spanish event views from cache (7 days to 2026-11-01), and a miss took 0.28-0.53 s vs 0.11-0.15 s for a hit.

**Next check:** CrUX weekly after develop reaches main; GA `web_vitals` with the LCP element (#591) to measure the consent box share.

## 2026-11-02 (2): consent box, event image, TBT, listings

**Field (CrUX, production, phone, p75, period to 2026-10-31):** no change. LCP 2.58 s, INP 189 ms, CLS 0.28, FCP 1.27 s, TTFB 0.53 s. develop is not on main yet, so ISR, Redis memory and GA `web_vitals` (#591) could not be checked on production.

### Consent box (#609)

The Funding Choices (FC) loader moved from a `lazyOnload` script (after hydration and the load event) to `<script async>` in `<head>`, as in Google's snippet. The "show the box by hand" fallback was rewritten.

Bug found on production: the old fallback opened the box whenever the `googlefcInactive` frame existed. FC creates that frame for every visitor, so returning visitors got the box on every page view. On slow phones it also opened before FC's own box, so two boxes opened and the first "Consentir" did not close it. The new fallback listens to TCF events. It shows the box only when FC's first event says GDPR applies and has no stored consent string, and FC has not reported `cmpuishown` 3 s later.

Lab: before = develop `a1ea418d`, after = `2f91ca83` (first #609 commit; the review fixes merged as `99021ff0` only change when the 3 s wait starts and were re-checked against the real FC). Local build served under the production host name (see method below), Pixel 7, 4x CPU, 1.6 Mbps / 150 ms, median of 3. Ads and analytics requests blocked; FC real.

| Page | First visit: box / LCP before | After | Returning visitor LCP before | After |
|---|---|---|---|---|
| `/` | box 5.21 s, LCP 1.26 s (image) | box 7.16 s (fallback, not LCP), LCP 1.34 s | 1.26 s, box shown again | 1.34 s, no box |
| `/barcelona` | 4.18 / 4.20 s (box) | **3.62 / 3.64 s** | 4.86 s (box) | **1.44 s** |
| Event with image | box 5.08 s, LCP 0.97 s | box 3.74 s, LCP 0.97 s | 0.96 s, box shown | 0.96 s, no box |
| Event without image | 4.52 / 4.53 s (box) | **3.83 / 3.84 s** | 5.01 s (box) | **0.88 s** |

- Cost: domInteractive +0.1-0.2 s (the FC script now loads during parsing).
- `fetchPriority="high"` on the loader was tested and rejected: domInteractive +0.3-0.5 s and home LCP 1.28 → 1.61 s.
- On `/`, FC itself shows no box to a new visitor (one TCF event, no `cmpuishown`). That is why the fallback exists. Its cause is likely a setting in AdSense "Privacy & messaging".
- TCF on production: `gdprApplies` is true on FC's first event; a returning visitor's first event is `tcloaded` with the consent string. With FC on our site `getTCData` always fails (deprecated in TCF 2.2; use `addEventListener`). The `FCCDCF` cookie is set on a first visit too, so it does not mean "already chose".

### Event page image

- Same session, same slug: LCP 1.28 s (`1ee9aa30`) → **0.94 s** (develop). The earlier 3.0 s was not reproduced; it was likely a slow, uncached image fetch.
- Hero preload and `<img>` use the same `sizes`; a Pixel 7 picks the 1200w WebP at q50 (28 KB, from a 60 KB JPEG).
- `/api/image-proxy` has no cache at the origin: each request fetches the original and runs Sharp. Locally 150-270 ms per request, vs 80-160 ms for the original file. On www, Cloudflare returns `DYNAMIC` for it (not cached), although the response has a 1-year `immutable` header when `?v=` is present. A Cloudflare cache rule for `/api/image-proxy*` is the fix (pending).

### TBT

| Page | Before (`1ee9aa30`) LCP / TBT / domInteractive | Now (develop `a1ea418d`) |
|---|---|---|
| `/` | 1956 / 41 / 3123 ms | 1272 / 46 / 3030 ms |
| `/catalunya` | 2084 / 43 / 2995 ms | 884 / 46 / 2287 ms |
| `/barcelona` | 1736 / 38 / 1695 ms | 1172 / 43 / 1178 ms |
| Event with image | 1284 / 46 / 1995 ms | 940 / 49 / 1577 ms |
| Event without image | 632 / 37 / 1621 ms | 596 / 43 / 1327 ms |

- A performance trace shows **no new long task**. Both versions have one long task: evaluating the react-dom chunk plus its microtasks (hydration start), about 90 ms before and 95 ms now. That is the +5 ms TBT.
- Total JavaScript time is lower now (CPU profile on `/catalunya`: react-dom chunk 233 → 135 ms, all JS 297 → 221 ms).
- Largest avoidable item: about 23 ms per page in `IntlMessageFormat.resolveLocale` (next-intl formats ICU messages at runtime). next-intl 4.14 can precompile messages at build time (`experimental.messages.precompile`, about 9 KB less JS and no runtime parsing). It does not support `t.raw()`, which we use in 5 places (month names, category templates), so those need to move to plain keys first.

### Listings: static shell?

| Page | FCP | LCP | Gap | Server time (warm) |
|---|---|---|---|---|
| `/` | 0.68 s | 1.27 s | 0.60 s | 312 ms |
| `/catalunya` | 0.58 s | 0.88 s | 0.31 s | 188 ms |
| `/barcelona` | 0.58 s | 1.17 s | 0.60 s | 702 ms |
| Event without image (ISR) | 0.60 s | 0.60 s | 0 | 27 ms |

Listings render their events on each request and reveal them through Suspense, 0.3-0.6 s after the first paint. That gap includes the React 19.2 reveal throttle (up to 300 ms). The ISR event page has no gap. A static listing shell would likely save 0.3-0.6 s of LCP. The cost:
- Every listing reader needs `"use cache"`, and the `connection()` calls on the listing path must go or move into a smaller dynamic part: `fetchWithHmac`, `generatePagesData`, `PlacePageShell` and `HomeStructuredData` (`app/[locale]/page.tsx`; the last two were added for tree mismatches), plus `SponsorBannerSlot` (sponsor lookup) and `lib/api/promotions.ts` (promoted events).
- Date filters ("avui", "demà") change at midnight, so they need a cached date.
- Cache size: a listing is 0.3-0.7 MB of HTML plus a similar RSC payload. The production Redis is 450 MB `allkeys-lru`, shared with event ISR pages. Places × dates × categories × 3 languages is far more than fits, so caching only the plain place pages (or the busiest places) is the realistic first step. Re-checked on 2026-11-06 (see that section): a stored page still streams its body as a hidden segment, and the estimated saving is 0.1-0.3 s, on Cloudflare misses only.

### INP

Not measured. It needs GA `web_vitals` INP attribution (#591) from production first, then a lab check of the slowest interactions at 20x CPU.

### Method: consent box in the lab

- FC shows no box on `localhost`. Serve the local build under the real host name: start Chromium with `--host-resolver-rules=MAP www.esdeveniments.cat 127.0.0.1:<port>`.
- For returning-visitor tests use HTTPS: over plain http FC's consent cookies do not persist, and the box reappears. A small local TLS proxy with a self-signed certificate plus Playwright `ignoreHTTPSErrors` works.
- Block ads and analytics requests, keep FC: `/googlesyndication|doubleclick|google-analytics|googletagmanager|adtrafficquality|googleadservices|\/pagead\//`.

**Next check:** after develop reaches main: CrUX weekly; Cloudflare cache status and full-HTML time for `/e/*` misses vs hits; production Redis `used_memory`; GA `web_vitals` LCP element and INP attribution (#591).

## 2026-11-02 (3): #608, #612, #613

Lab, same session, same slugs. Before = develop `700d65ff` (before #608), after = develop `28f493a6`. Both are E2E builds (Google scripts off), `yarn start`, `scripts/perf-lab.mjs`, Pixel 7, 4x CPU, 1.6 Mbps / 150 ms, median of 3.

- #608: "Where to eat" restaurants load on click (no Places call on page load).
- #612: next-intl messages precompiled at build time (the `t.raw()` lists moved to `i18n/locale-lists.json`). This is the precompile item from the TBT section above.
- #613: `"use cache"` works in production; town listing events are cached.

| Page | Before LCP / TBT / JS | After LCP / TBT / JS | Server warm before → after |
|---|---|---|---|
| `/` | 1280 / 70 ms / 311 KB | 1280 / 67 ms / 301 KB | 299 → 193 ms |
| `/catalunya` | 904 / 52 ms / 346 KB | 876 / 57 ms / 337 KB | 187 → 169 ms |
| `/barcelona` | 1176 / 54 ms / 346 KB | 1176 / 51 ms / 337 KB | 713 → 483 ms |
| Event with image | 940 / 69 ms / 340 KB | 932 / 46 ms / 330 KB | 38 → 22 ms |
| Event without image | 880 / 57 ms / 340 KB | 616 / 52 ms / 330 KB | 41 → 34 ms |

- JS is 9-10 KB smaller on every page (#612).
- `/barcelona` server time drops by about 230 ms (#613). Lab LCP does not move because the listing still reveals through Suspense (see "Listings: static shell?" above).
- TBT moves within noise except the event with image (69 → 46 ms). TBT in this session runs higher than the previous session for both builds; compare only within a session.
- The event-without-image LCP of 880 ms "before" is above the 596-632 ms seen in earlier sessions, so treat that row's gain as noise.

Cloudflare: the production `/api/image-proxy` cache rule for `www.esdeveniments.cat` exists but stays **disabled** until develop reaches main. Main picks the image format from the `Accept` header and sends `Vary: Accept`; develop picks it from the URL `format` param, which is safe to edge-cache. Enable it at release, then check `cf-cache-status: HIT` on a repeated image URL.

## 2026-11-03: SEO fixes (place 404/301 in Proxy)

Server-only change: no client JS, no new LCP work. Proxy now checks the first path segment of listing URLs against the places list (see LESSONS.md, "A page can't set its own 404 or 301").

Local production build (`yarn build:development`, `yarn start:development`, dev backend), curl `time_total`, one run:

| Request | First hit (cold process) | Warm |
|---|---|---|
| `/barcelona` | 794 ms (includes the one places list call) | 83 ms |
| `/girona/concerts` | 140 ms | 69 ms |
| `/no-such-place-xyz` (404) | 1036 ms | 79 ms |
| `/lagarriga` (301) | 65 ms | |

- Warm cost is an in-memory scan of ~1,000 slugs. A cold process pays one `/places` + `/regions` list call per hour; a slug not in the list (a province) pays one `/places/{slug}` call, cached for 1 h. Both are bounded by a 1.5 s abort signal, after which the page renders as before.
- 513 of the 515 Catalan place URLs in the production place sitemap return 200 on this build; the other 2 (`campdevanol`, `torrebeses`) are missing from the dev backend only and return 200 in production.

What to watch after release (field data needs days to weeks):

- Search Console → Pages: "Not found (404)" should rise (junk place URLs that used to return 200), "Soft 404" and "Crawled – currently not indexed" should fall. "Page with redirect" rises by the alias URLs.
- Search Console → Enhancements → Events: valid items stay stable; no new "misleading" or invalid `image`/`performer`/`organizer` warnings.
- GA4 `web_vitals` TTFB and LCP on place pages, and `python3 scripts/crux-check.py` after 4 weeks: no regression.
- Backend: request volume on `/places/{slug}` should not grow (the list answers most lookups).

## 2026-11-03: Cloudflare Cache-Tag purge

Publish, edit and delete now purge the affected pages from Cloudflare by `Cache-Tag` instead of waiting for `s-maxage=1800` (see LESSONS.md, "Next's `updateTag` doesn't clear Cloudflare"). `s-maxage` is unchanged.

Baseline before the change, production, curl from a home connection, 2026-11-03 17:40 UTC, two runs each:

| Request | First run | Second run |
|---|---|---|
| `/` | HIT, 250 ms | HIT, 119 ms |
| `/es` | EXPIRED, 254 ms | HIT, 119 ms |
| `/barcelona` | EXPIRED, 268 ms | HIT, 113 ms |
| `/es/barcelona` | EXPIRED, 263 ms | HIT, 106 ms |
| `/catalunya` | EXPIRED, 251 ms | HIT, 97 ms |
| `/girona/avui` | MISS, 255 ms | HIT, 87 ms |
| `/api/events?page=0&size=10` | DYNAMIC, 768 ms | DYNAMIC, 861 ms |

- A HIT costs about 100 ms TTFB; a MISS or EXPIRED about 250 ms. A purge turns the next request for each purged page into a MISS, so watch the hit ratio.
- Cloudflare caches HTML only on www. `/api/*`, RSC requests, staging HTML and AI bots are DYNAMIC.
- Before: a new or edited event reached its place listing after up to 30 min (the page's remaining `s-maxage`). Each publish or delete now purges up to 7 tags (home, `catalunya`, city, region, province, event, owner) in one request; an edit that moves the event sends both sets, still one request.

Still to record after the production deploy:

- Time from publishing a test event to seeing it on its place listing through Cloudflare (expected: seconds).
- Cloudflare cache hit ratio and TTFB over 48 h, compared with the 48 h before.


## 2026-11-04: production after release #630

First measurement of production after develop reached main (#630, `ac5aa010`, backend v2). Same script and profile as the 2026-11-02 "Live" column: `scripts/perf-lab.mjs`, Pixel 7, 4x CPU, 1.6 Mbps / 150 ms, median of 3. Live runs include the Google scripts (consent box, ads, analytics). Event: `bibliobus-puigdon-4-de-novembre-del-2026-df7q7ms7pep3vgsgqe1l7l342c` (with image).

| Page | Metric | Live 2026-11-02 (old main) | Live 2026-11-04 |
|---|---|---|---|
| `/` | LCP | 3.37 s (hero image) | **1.62 s** (image) |
| | FCP / TBT | 3.37 s / 95 ms | 0.90 s / 128 ms |
| | domInteractive | 2.60 s | **0.94 s** |
| | HTML / total | 1317 / 812 KB | 1022 / 719 KB |
| `/catalunya` | LCP | 3.23 s (image) | 3.80 s (consent box); own content **1.17 s** |
| | TBT | 136 ms | 158 ms |
| | domInteractive | 2.01 s | **0.74 s** |
| | HTML / total | 959 / 905 KB | 603 / 665 KB |
| `/barcelona` | LCP | 6.04 s (consent box) | 3.92 s (consent box); own content **1.14 s** |
| | TBT | not recorded | 206 ms |
| | domInteractive | 2.03 s | **0.80 s** |
| | HTML | 980 KB | 650 KB |
| Event with image | LCP | 2.53 s (image) | 2.96 s (image) |
| | TBT | not recorded | 163 ms |
| | domInteractive | 1.21 s | **0.72 s** |
| | HTML / total | 448 / 985 KB | 376 / 793 KB |

Server time for the full HTML through Cloudflare (`perf-lab.mjs` fetch, cold / warm): `/` 152 / 106 ms, `/catalunya` 906 / 35 ms, `/barcelona` 109 / 67 ms, event 813 / 31 ms. Browser TTFB 77-118 ms.

**Findings:**
- Our own content paints in 1.1-1.6 s on every page measured, and domInteractive fell from 2.0-2.6 s to 0.7-0.9 s.
- On listings the reported LCP is the Funding Choices consent box text at 3.8-3.9 s. A Playwright LCP-entry trace confirmed it: our intro paragraph is an earlier LCP entry at 1.1-1.2 s. It is still the main open LCP problem, but `/barcelona` went from 6.04 s to 3.92 s.
- A Cloudflare HIT answers in under 0.12 s. A miss took 0.8-0.9 s (`/catalunya`, the event page) against 31-35 ms warm, probably backend v2. Watch it.
- TBT is 128-206 ms, against 95-136 ms live on 2026-11-02. Live runs include Google's scripts, so it is noisy; `/barcelona` is above Google's 200 ms. Recheck with a lab build.
- The event page with an image is still limited by the image download (about 3 s).
- No React hydration errors on `/`, `/catalunya` and `/barcelona` in a real browser after the deploy.

**Next check:** CrUX (`python3 scripts/crux-check.py`) about 4 weeks after 2026-11-04; a lab TBT comparison of main against the 2026-11-02 "Now" build.

## 2026-11-05: inline root shell (#656, release #657)

Release #657 (`e768a37d`) removed the root layout `<Suspense>`, so the navbar is in the first HTML (#656), and added the home and event loading skeletons (#653, #654). "Before" = main `9e5ae714`, "after" = main `e768a37d`, both built locally and measured in the same session against the same API. Pixel 7, 4x CPU, 1.6 Mbps / 150 ms. Event: `oficina-itinerant-dhabitatge-i-rehabilitacio-11-de-novembre-del-2026-221a4fc1-aff6-4795-8da8-ef0ea943bffc` (no image).

**First visit, no Google scripts** (E2E build, `scripts/perf-lab.mjs`, two passes run before-after-after-before, median of 3 each, shown as pass 1 / pass 2):

| Page | FCP before → after | LCP before → after | TBT before → after | HTML raw |
|---|---|---|---|---|
| `/` | 724 / 692 → 720 / 716 ms | 1288 / 1320 → 1312 / 1304 ms | 156 / 146 → 162 / 149 ms | 569 → 591 KB |
| `/catalunya` | 1004 / 952 → **628 / 632** | 1004 / 952 → 924 / 904 | 159 / 101 → 159 / 133 | 545 → 552 KB |
| `/barcelona` | 1512 / 948 → **616 / 616** | 1632 / 948 → 940 / 912 | 188 / 123 → 135 / 116 | 325 → 332 KB |
| Event | 1008 / 984 → **624 / 632** | 1008 / 984 → 892 / 924 | 140 / 104 → 154 / 145 | 303 → 316 KB |
| `/preferits` | 992 / 620 → 616 / 628 | 992 / 620 → 896 / 872 | 212 / 148 → 157 / 130 | 229 → 239 KB |

CLS is the same on every page (0 to 0.006 here; 0 to 0.008 in every other lab run in this section except one, noted in the follow-up).

`/preferits` pass 2 "before" painted everything in one frame (FCP = LCP = 620 ms), so it was remeasured with the production builds (7 runs each, alternated): without Google scripts, FCP 624 → 628 ms and **LCP 624 → 916 ms**; with Google scripts, FCP 640 → 636 ms and **LCP 640 → 960 ms**. The LCP regression on `/preferits` is real; see the findings.

**Repeat visit** (same profile, `/` loaded first so the JavaScript is cached, then the page; median of 5):

| Page | FCP before → after | LCP before → after | Client-rendered boundaries |
|---|---|---|---|
| `/` | 352 → **248 ms** | 564 → **384 ms** | 2 → 0 |
| `/catalunya` | 564 → **272** | 964 → 1028 | 7 → 7 |
| `/barcelona` | 536 → **340** | 940 → **664** | 2 → 2 |
| Event | 628 → **372** | 628 → 724 | 2 → 2 |
| `/preferits` | 552 → **324** | 552 → 592 | 0 → 0 |

"Client-rendered boundaries" counts streamed sections React threw away and rendered again on the client (`removeChild` of a `/$` marker called from `/_next/static/`).

**First visit with Google scripts** (production builds served as `https://www.esdeveniments.cat` through a local TLS proxy and `--host-resolver-rules`, so Funding Choices and gtag.js run for real; ads and GA hits blocked: `/googlesyndication|doubleclick|adtrafficquality|googleadservices|google-analytics\.com|\/g\/collect|\/pagead\//`; median of 5, runs alternated):

| Page | FCP before → after | LCP before → after | TBT before → after (all 5 runs after) |
|---|---|---|---|
| `/` | 720 → 728 ms | 1408 → 1420 ms | 605 → 622 ms (622/680/481/621/655) |
| `/catalunya` | 996 → **664** | 1016 → 1016 | 664 → 582 (764/727/562/582/555) |
| `/barcelona` | 1020 → **656** | 1020 → 1036 | 659 → 781 (666/743/781/800/782) |
| Event | 1016 → **640** | 9464 → 9464 (a late paint in both builds, not investigated) | 518 → 568 (657/833/568/488/443) |

**TBT on production by script** (`/` and `/barcelona`, 3 runs each, blocking one origin at a time): everything 404-740 ms, without gtag.js 254-421 ms, without Funding Choices 269-352 ms, without both (and ads) 152-270 ms. gtag.js and Funding Choices each add about 150-250 ms; our own JavaScript is about 150-170 ms.

**Production, after the deploy** (`scripts/perf-lab.mjs`, live, same profile as 2026-11-04): `/` FCP 0.88 s, LCP 1.89 s (image), TBT 672 ms; `/catalunya` 0.86 / 1.18 s (text), TBT 835 ms; `/barcelona` 0.83 / 1.15 s (image), TBT 801 ms; event 0.78 / 3.98 s (image), TBT 884 ms. In a throttled check (4x CPU, 150 ms, 1.6 Mbps) the navbar was in the first contentful paint on `/`, `/barcelona` and `/preferits` in every run.

**Field (CrUX, phone, p75, 2026-10-07 to 2026-11-03, before this release; a later window than the 2026-11-02 section):** LCP 2.58 s (73% good), INP 186 ms (81%), CLS 0.22 (72%), FCP 1.22 s, TTFB 0.52 s. CLS p75 history: 0.02 (May) → 0.05 (Aug) → 0.28 (Oct).

**Findings:**
- FCP and the navbar are 0.1-0.4 s earlier on listings, the event page and `/preferits`, first visit or repeat. `/` is unchanged on a first visit and 0.1 s faster on a repeat visit.
- LCP was mixed. It improved on `/` and `/barcelona` (repeat visit) and was about the same on most first visits, but it got worse where the data was ready soon after the shell: `/preferits` +290-320 ms on a first visit, and `/catalunya`, the event page and `/preferits` +40-100 ms on a repeat visit. Cause: React 19.2 reveals a streamed boundary no earlier than 300 ms after the shell's first frame (`$RC` waits until `$RT + 300`; `$RT` is set in the first `requestAnimationFrame` after the shell). The new shell (navbar plus skeleton) paints first, so content that is ready sooner waits for that window. Before, nothing painted until the single root reveal. Fixed in the follow-up below.
- TBT is the same within noise, with and without Google scripts. The production TBT of 600-900 ms (against 128-206 ms on 2026-11-04) comes from gtag.js and Funding Choices, whose loading code this release did not change. It is the largest open item for TBT and INP. Why it is 3-4x the 2026-11-04 number is not known: Google's script payloads, consent state and this machine can all differ between sessions (this session's lab TBT without Google, ~100-160 ms, is also 2-3x the 2026-11-02 lab numbers). Compare TBT only within one session.
- The extra 7-22 KB of raw HTML is the RSC payload of the new loading skeletons (on `/preferits`, six skeleton cards). Markup is unchanged; transferred bytes grew 2-6 KB.
- Field CLS (0.22) predates this release. Lab CLS is 0-0.008 on every page (one unreproduced exception in the follow-up), so the field shifts come from what the lab doesn't show (ads, the consent box; see 2026-11-02).

**Follow-up: no 300 ms reveal throttle** (`REVEAL_THROTTLE_OFF_SCRIPT` in `utils/constants.ts`, the first inline script in the root `<head>`; it makes `window.$RT` read as undefined while the tab is visible, so `$RC` reveals on the next frame; hidden tabs keep React's timeout). Production builds of e768a37d with and without the script, same lab profile, runs alternated:

| Page | LCP without → with (no Google, median of 7) | LCP without → with (Google, median of 5) |
|---|---|---|
| `/preferits` | 932 → **684 ms** | 984 → **708 ms** |
| `/catalunya` | 992 → **820** | — |
| `/barcelona` | 980 → **752** | 1000 → **792** |
| `/` | 1324 → 1316 (hero image) | — |
| Event | 1000 → **756** | 9412 → 9380 (the late paint above) |

FCP moved by 30 ms or less either way, the navbar paints at the same time, and TBT is the same within noise (no Google: 152-187 → 159-174 ms; Google: 553-711 → 512-736 ms). Max CLS with the script was 0-0.008. One with-Google `/barcelona` run without the script hit 0.125, the only lab run in this section above 0.008; it wasn't reproduced. `test/react-reveal-throttle.test.ts` fails if a React upgrade changes the `$RT` code the script relies on.

**Next check:** CrUX about 4 weeks after 2026-11-05 (FCP should drop; watch CLS); TBT from gtag.js and Funding Choices (for example, start gtag.js after the first interaction, like AdSense); GA `web_vitals` CLS attribution (#591) to find the field shifts.

## 2026-11-06: listing content in the first HTML?

Question after release #665 (the reveal-throttle fix on production): can the listing and event content (h1, first cards, LCP image) be part of the first HTML instead of a streamed section? Short answer: not with a `<Suspense>` around the page body, and the part that can be done (a stored listing page) saves little for its cost. Not built.

**Where the content sits today** (staging, `/barcelona`, repeat visits so the page is warm): 342 KB of HTML (44 KB brotli). The shell (head, navbar, skeleton) ends at 27 KB. The list is the hidden segment `S:14` at 167 KB, after about 115 KB of inline RSC data; the LCP image is at 168 KB and the h1 at 175 KB. Production `/barcelona` (604 KB) is the same: shell to 27 KB, LCP image at 168 KB, h1 at 185 KB. The event page (its body is already `"use cache"`) is the same too: the h1 is in a hidden segment at 59 KB.

**Why a stored page doesn't change that:** React 19.2 moves a finished `<Suspense>` boundary into a hidden `<div id="S:…">` (revealed by `$RC`) when it is over 500 B and the bytes already written in the same flush plus its own pass 12.8 KB, or when it holds suspensey images or deferred content at any size (`isEligibleForOutlining` and `progressiveChunkSize` in `react-dom-server`; Next keeps the 12.8 KB default for page renders). Every page body here passes the size rule, cached or not. The listing and event bodies need their boundary (the skeleton for unknown params, `partialPrefetching`), so their content always arrives as a hidden segment. With the throttle fix the reveal costs one frame, so what matters is how soon those bytes arrive.

**What a stored listing would save** (production origin, a cache-busting query to skip Cloudflare, 4 runs each, after the deploy):

| Page | First byte | Last byte |
|---|---|---|
| `/catalunya`, `/barcelona`, `/girona`, `/barcelona/avui` | 0.15-0.34 s | 0.34-0.60 s |
| Event (`"use cache"` body, stored) | 0.15-0.19 s | 0.26 s (one run 0.49 s) |
| Cloudflare HIT (`/barcelona`) | 0.08 s | 0.13 s |

Estimate, not measured: if a stored `/[place]` page behaved like the stored event page, its content would arrive about 0.1-0.3 s sooner, but only on a Cloudflare miss or expiry. The table compares different pages and their last byte, not when the list arrives; measure the same listing before and after storing it to confirm. Hits, the common case for busy pages, would not change. Cloudflare caches per PoP, so misses are common on long-tail places.

**Cost:**
- Next 16.4 stores a URL after its first visit (`node_modules/next/dist/docs/01-app/02-guides/incremental-static-regeneration-cache-components.md`). Parts that reach uncached data or request-time APIs (`connection()`, `headers()`, `cookies()`) stay as their `<Suspense>` fallbacks in the stored page and render per request. So the list, the h1 and everything above them must be cacheable; the sponsor and promoted row can stay request-time holes. On `/[place]` that means about 12 files:
  - Readers that call `connection()`: `fetchCategories`, `fetchPlaceBySlug` (alias redirect), `fetchRegionsWithCities` (`ExploreNearby`), `generatePagesData`, `PlacePageShell`, `fetchPromotedEvents`.
  - `getLocaleSafely()` in `PlacePageShell`, `PlacePageExploreNav`, `CategoryQuicklinks`, `ExploreNearby` and `PromotedEventsSection`. Inside `"use cache"` its `headers()` call throws and it silently returns `ca`, so Spanish and English pages would render in Catalan. It must become a locale prop.
  - `SponsorBannerSlot` (inside `HybridEventsList`) and the promoted row become request-time slots.
- Storage: a stored listing is about 0.6 MB (HTML plus RSC), uncompressed in Redis (`cache-handler.mjs`). Production Redis is `maxmemory 256mb` `allkeys-lru` per `docs/self-hosted-resource-limits.md` (the 2026-11-02 section above says 450 MB; not checked). About 400-750 listing URLs (places × 3 languages, which crawlers request) would fill it and evict the stored event pages, which are smaller and already fast. The `"use cache"` store adds 64 MB per process.

**Do first, if this comes back:** compress Redis entries in `cache-handler.mjs` (HTML and RSC compress about 8x: 342 → 44 KB here), then measure Redis memory and the CDN hit rate on production. With compressed entries, storing `/[place]` pages becomes cheap; the refactor above is still needed.

## 2026-11-06 (2): event 404s, field data, Google TBT, stored listings

Four open items from the sections above, measured on production (www, from Barcelona, Cloudflare PoP MAD) on 2026-11-06. Lab runs: Playwright Chromium, Pixel 7, 4x CPU, 1.6 Mbps / 150 ms, first visit, ads and analytics hits blocked (`/googlesyndication|doubleclick|adtrafficquality|googleadservices|google-analytics\.com|\/g\/collect|\/pagead\//`), median of 5 unless noted.

### Unknown event pages: 200 + noindex (not changed)

- A deleted slug serves `200`, `noindex`, the title "No event found" and `NEXT_HTTP_ERROR_FALLBACK;404`; Cloudflare caches it like any page. A missing place gets a real `404`, which Cloudflare also caches (MISS 0.79 s, then HIT 0.14 s).
- **Search Console → Pages** (data to about 2026-10-25): "Excluded by noindex" 40,037, "Crawled – currently not indexed" 47,012, **"Soft 404" 436**, "Not found (404)" 11. The soft 404 examples are listing and `/sitemap/<place>/<year>/<month>` URLs crawled April to August, plus staging URLs; no event pages.
- The 1,000-row example list of "Excluded by noindex" has 890 event URLs: 467 ended more than 60 days ago (intended, `EXPIRED_EVENT_NOINDEX_DAYS`), **316 were live events noindexed by a bug** (below), and 107 (12%) were deleted events.
- Cost of a check in Proxy: one backend lookup per slug, about 100 ms at the origin (`/api/events/<slug>` cold 0.18-0.22 s vs warm 0.11 s). Most event views reach the origin (Cloudflare served 15% of Spanish event views, 2026-11-02 section), and the shared `eventDetailCache` keeps a slug for 30 min, the same as Cloudflare's `s-maxage`, so most of those views would wait for it.
- **Decision: not built.** Deleted events already stay out of the index through `noindex`, and Google doesn't file them as soft 404s. A real 404 would add up to ~100 ms of TTFB to most event views for no indexing change. Revisit if Search Console starts listing event URLs under "Soft 404".
- **Bug found and fixed (#668, released in #675):** `isMalformedEventSlug` flagged every slug over 120 chars. Backend v2 slugs end with the date and a 36-char UUID, so 408 of 3,000 live events (13.6%, up to 215 chars, all real titles) were `noindex` and missing from the events sitemap. After the release the production events sitemap lists 407 slugs over 120 chars (0 before), and the 127-char example serves `index, follow`.

### Field data (CrUX): too early

`python3 scripts/crux-check.py`, phone, p75, collection period 2026-10-07 to 2026-11-03, which ends before releases #657 (2026-11-05) and #665 (2026-11-06):

| | Phone | Desktop |
|---|---|---|
| LCP | 2.58 s (73% good) | 2.26 s |
| INP | 186 ms (81%) | 78 ms |
| CLS | 0.22 (72%) | 0.01 |
| FCP | 1.22 s (90%) | 0.75 s |
| TTFB | 0.52 s (90%) | 0.41 s |

Same values as the 2026-11-05 section; single URLs (`/`, `/catalunya`, `/barcelona`) still have no CrUX data. The phone-only CLS (desktop 0.01) fits shifts from ads on phones. GA4 `web_vitals` CLS attribution (#591) could not be read: the Analytics Data API needs `analytics.readonly`, and the local ADC token has expired (`gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/webmasters.readonly`). **Next check: 2026-12-03**, with the GA4 query: event `web_vitals`, `metric = CLS`, by `element`, phone only.

### TBT from Google scripts: what blocks, and when

Production, first visit; `all` = as served, `noGtag` / `noFC` / `none` = gtag.js, Funding Choices, or both blocked. "Blocking by script" splits each long animation frame's blocking time by its scripts' duration (LoAF `scripts[]`). Script: `scripts/perf-google-tbt.mjs` (method below).

| Page | Variant | load | LCP | TBT | Blocking by script (median run) | gtag.js frames (start, blocking) |
|---|---|---|---|---|---|---|
| `/` | all | 3975 ms | 1956 (image) | 426 | ours 198, FC 142, gtag 106 | 5228 ms 64, 5342 ms 54 |
| | noGtag | 3979 | 2044 | 381 | ours 235, FC 181 | |
| | noFC | 2816 | 1808 | 309 | gtag 212, ours 167 | 4451 ms 87, 4588 ms 65 |
| | none | 2868 | 1892 | 168 | ours 399* | |
| `/barcelona` | all | 4396 | 992 (image) | 591 | FC 260, ours 205, gtag 138 | 6487 ms 129, 6668 ms 149 |
| | noGtag | 4427 | 1000 | 307 | FC 169, ours 129 | |
| | noFC | 2793 | 960 | 386 | gtag 178, ours 168 | |
| | none | 2762 | 968 | 127 | ours 88 | |
| Event (image) | all | 5020 | 1052 (image) | 986 | gtag 393, ours 330, FC 265 | 6336 ms 202, 6588 ms 257 |
| | noGtag | 4615 | 1028 | 408 | FC 198, ours 180 | |
| | noFC | 2637 | 960 | 356 | gtag 222, ours 86 | |
| | none | 2685 | 972 | 238 | ours 175 | |

\* LoAF split by script duration; one run, noisy.

- gtag.js runs two long frames **1.1-1.6 s after the load event** and blocks 100-400 ms per page. FC blocks 140-300 ms and **delays the load event by 1.2-2.4 s** (it loads during parsing).
- A tap 1 s after load (5 runs per variant) took 16-88 ms in every variant: gtag hadn't started yet.
- Because FC delays `load`, `lazyOnload` already starts gtag.js 5-6.5 s after navigation on this profile. "First interaction or timeout" (as AdSense) would start it **earlier** for visitors who scroll or tap first, and put its 250-580 ms of frames right after that first interaction, where the next tap is likely. Lab TBT would only drop because `perf-lab.mjs` stops counting 5 s after load.
- Cost side: page_view, consent-mode pings and early `web_vitals` events stay queued in `dataLayer` until gtag.js loads, so visits that end before the trigger are lost.
- **Decision: not built.** The work doesn't go away, and its timing gets worse for engaged visitors. INP (186 ms phone p75, 81% good) is the metric to watch: when the GA4 API is available, check `web_vitals` INP by `load_state` and `element`; only INPs during gtag's frames would justify moving it.
- **The "event page paints 9464 ms late" case** (2026-11-05, event without an image, local TLS proxy) does not reproduce on production. On a no-image event the LCP is the FC consent box at **3.56-3.82 s** with or without gtag (3 runs each); with FC blocked the h1 paints at 0.77-0.85 s. FC stays where it is (hard rule); its box is the LCP of first visits on pages without an LCP image.

### Stored listing pages

**Step 1, Redis compression (#669, released in #675).** A local production build against `redis:7-alpine` stores one entry per route and locale (`/ca`, `/ca/[place]`, `/es/[place]`, `/ca/e/[eventId]`), 375-404 KB each: html 41-47 KB, `rscData` 109-117 KB and `segmentData` 217-234 KB, the last two base64. gzip of that JSON: 2.9x. Unpacking the base64 first and using brotli q4: **9.1x (≈43 KB)**, 1.6-1.9 ms per set and 0.5-0.7 ms per get (`JSON.parse` alone: 0.24 ms). Raw bytes instead of base64 text would give 12.1x but needs a Buffer client wrapped around the library's internals. Same pages before/after: `used_memory_dataset` 2.15 → 0.69 MB.
Found on the way: the stale-build purge had never worked (node-redis 6 rejects a numeric `SCAN` cursor: `"arguments[1]" must be of type "string | Buffer"`), so every deploy's keys stayed until `allkeys-lru` evicted them. With #669 the old build's 12 keys were removed at start.

**Step 2, production Redis and Cloudflare.**
- Redis, read with the authenticated `/api/health` (#670): production `maxmemory` is **450 MiB** (471,859,200 bytes, `allkeys-lru`; `docs/self-hosted-resource-limits.md` said 256 MB), staging **200 MiB** (the doc said 64 MB). Production since its Redis last started: 0 evictions, 1.11 M hits and 0.94 M misses (54%). Staging before #669: 499 keys, **172 MB of 200 MB**, 65% hits; right after #669 deployed, the purge left 4 keys and 1.4 MB. Production right after release #675: 54 keys, 2.6 MB; 132 keys and 3.4 MB after a few page loads. The memory was old builds' keys, not current pages.
- Cloudflare, listings (one request per URL, 120 random place pages in ca/es/en + 10 busy ones, PoP MAD, 2026-11-06 ~10:20 UTC): **124 MISS, 5 HIT, 1 EXPIRED**. Even `/tarragona`, `/sabadell`, `/terrassa` and `/es/barcelona` were misses; `/`, `/barcelona`, `/girona` and `/lleida` were hits. MISS: TTFB 0.26 s, last byte 0.79 s (median); HIT: 0.075 / 0.14 s. Cloudflare analytics by cache status needs a token with Analytics read (the deploy token only purges) or the dashboard.

**Step 3, would a stored `/[place]` page help?** When the content bytes arrive on an origin miss (`?nc=<random>` skips Cloudflare; 5-7 runs, median, ms):

| Page | First chunk | LCP image in HTML | Visible h1 | Last byte |
|---|---|---|---|---|
| `/barcelona` (two sessions) | 202 / 213 | 278 / 387 | 299 / 387 | 364 / 681 |
| `/girona` | 172 | 298 | 298 | 385 |
| `/catalunya` | 189 | 250 | 250 | 301 |
| `/es/barcelona` | 174 | 292 | 292 | 339 |
| `/tarragona` | 189 | 284 | 284 | 362 |
| `/barcelona/avui` | 169 | 464 | 514 | 602 |
| Event, `"use cache"` body (two events) | 127 / 154 | 160 / 201 | 160 / 201 | 216 / 265 |
| `/barcelona`, Cloudflare HIT | 54 | 57 | 58 | 61 |

The listing body arrives 61-174 ms after the first chunk (295 ms on `/barcelona/avui`); a stored event body 33-47 ms after. **A stored listing would save about 30-130 ms** of content arrival, on Cloudflare misses only, not the 0.1-0.3 s estimated earlier. **Decision: not built.** It is still the ~12-file refactor listed in the 2026-11-06 section, with the silent-Catalan locale trap, for a gain smaller than the run-to-run noise of these pages. Cheaper target if listings come back: why `/barcelona/avui` waits 295 ms (date pages may miss the `fetchEventsCached` entry).

### Method: TBT by script

Playwright on production with `page.route` blocking the analytics/ads hits above plus the variant's script; observers for `longtask` (TBT = sum over 50 ms until load + 5 s, as `perf-lab.mjs`), `long-animation-frame` (blocking time and `scripts[].sourceURL`), `largest-contentful-paint` (element; text inside `.fc-consent-root` counts as "consent box") and `event` (interaction duration for the tap). Stream timing (`scripts/perf-stream.mjs`): Node `fetch` with a Chrome UA and `accept-encoding: br`, reading chunks and noting when `fetchPriority="high"` and the first `<h1>` without `sr-only` appear.
