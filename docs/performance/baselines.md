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

Lab: Pixel 7, 4x CPU, 1.6 Mbps / 150 ms, median of 3. HTML is raw (uncompressed) size.

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
