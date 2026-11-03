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
- Cache size: a listing is 0.3-0.7 MB of HTML plus a similar RSC payload. The production Redis is 450 MB `allkeys-lru`, shared with event ISR pages. Places × dates × categories × 3 languages is far more than fits, so caching only the plain place pages (or the busiest places) is the realistic first step.

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
