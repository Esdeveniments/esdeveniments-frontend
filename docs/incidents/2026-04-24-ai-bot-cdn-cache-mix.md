# Incident: AI Bot UA and Browser PPR Shell Share the Same CDN Cache (Apr 24, 2026)

## Summary

orank.ai scanned `esdeveniments.cat` and reported failures that looked like
the page was not server-rendered for AI agents:

- `content-no-js` (fail, -3pt): "Very little text content (50 chars) — likely JS-rendered"
- `semantic-indexing` (fail, -2pt): "~13 tokens, 0 headings, 0% content density"
- `content-efficiency` (fail, -1pt): "0.01% (96 text chars in 773KB HTML)"
- `sim-chatgpt` (fail, -1pt): "ChatGPT-User crawler reachability"
- `sim-claude` (fail, -1pt): "ClaudeBot crawler reachability"
- `json-ld` (warn, -3pt): "JSON-LD found (1 block) but no SoftwareApplication"

The yesterday fix (commit `84c6405d`) — appending `Slurp` to AI bot UAs so
Next.js's hardcoded `getBotType()` triggers blocking render — **works at the
origin**. Manual tests with a cache-buster confirm:

```
curl -A "ora-scan" "https://www.esdeveniments.cat/?_cb=$(date +%s)"
→ cf-cache-status: MISS, h1=2, h2=3, full SSR
```

But a repeat hit without the cache-buster returns:

```
curl -A "ora-scan" "https://www.esdeveniments.cat/"
→ cf-cache-status: HIT, x-nextjs-postponed: 1, h1=0, h2=0
```

The scanner was receiving a **cached PPR shell originally populated by a
browser request**.

## Root Cause

The origin emits:

```
Cache-Control: public, max-age=0, s-maxage=1800, stale-while-revalidate=3600
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding
```

No `User-Agent` in `Vary`. Cloudflare keys the cache by URL only. Order of events:

1. A browser hits `/` → origin returns PPR shell (`x-nextjs-postponed: 1`) → cached by CF for 30 min.
2. Any AI bot (`ora-scan`, `PerplexityBot`, etc.) hits `/` within that window → `cf-cache-status: HIT` → served the shell → empty content.

Known-bot UAs that Cloudflare's own Bot Management already classifies
(e.g. `GPTBot` hits `cf-cache-status: DYNAMIC`) are lucky: CF bypasses
cache for them. UAs not on that list (orank's `ora-scan`, `PerplexityBot`,
`DeepSeekBot`, etc.) are not.

## Impact

orank.ai score blocked at **79/100 (B)**. The checks above sum to roughly
**8–11 points** of unreachable gain until the CDN layer is fixed.

## Fix — Two Parts (Both Required)

### Part 1: In-repo (this PR)

`proxy.ts` now sets `Cache-Control: private, no-store` on HTML responses when
the User-Agent matches `AI_BOT_UA_RE`. This prevents a **bot-rendered
response** from being cached and served to browsers.

```ts
response.headers.set(
  "Cache-Control",
  isPersonalizedHtml || isAiBot
    ? "private, no-store"
    : "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600",
);
```

**This alone is NOT sufficient.** It stops bot → browser cache poisoning,
but does not stop a cached browser shell from being served to a bot.

### Part 2: Cloudflare Cache Rule (must be configured in dashboard)

A Cache Rule is required so Cloudflare bypasses the cache whenever the
User-Agent matches the AI bot regex. Without this, the in-repo change has
no effect on `sim-chatgpt` / `sim-claude` / `content-no-js`.

**Dashboard path**: Cloudflare → `esdeveniments.cat` zone → Caching →
Cache Rules → Create rule.

**Rule configuration**:

- **Name**: `Bypass cache for AI bots`
- **If** (custom filter expression):
  ```
  (http.user_agent contains "GPTBot") or
  (http.user_agent contains "ChatGPT-User") or
  (http.user_agent contains "OAI-SearchBot") or
  (http.user_agent contains "Claude-Web") or
  (http.user_agent contains "ClaudeBot") or
  (http.user_agent contains "anthropic-ai") or
  (http.user_agent contains "PerplexityBot") or
  (http.user_agent contains "Perplexity-User") or
  (http.user_agent contains "ora-scan") or
  (http.user_agent contains "ora-agent") or
  (http.user_agent contains "DeepSeekBot") or
  (http.user_agent contains "Qwen-Agent") or
  (http.user_agent contains "Bytespider") or
  (http.user_agent contains "CCBot") or
  (http.user_agent contains "Meta-ExternalAgent") or
  (http.user_agent contains "Meta-ExternalFetcher") or
  (http.user_agent contains "Applebot-Extended") or
  (http.user_agent contains "cohere-ai") or
  (http.user_agent contains "YouBot") or
  (http.user_agent contains "Diffbot") or
  (http.user_agent contains "Amazonbot") or
  (http.user_agent contains "Timpibot") or
  (http.user_agent contains "ImagesiftBot") or
  (http.user_agent contains "PetalBot") or
  (http.user_agent contains "Novellum")
  ```
- **Then**: **Bypass cache**
- **Save and Deploy**

Keep this list in sync with `AI_BOT_UA_RE` in [proxy.ts](../../proxy.ts).

## Verification

After deploying Part 1 AND configuring Part 2:

```bash
# Must show cf-cache-status: BYPASS (or DYNAMIC)
curl -sS -D - -o /dev/null \
  -A "Mozilla/5.0 (compatible; ora-scan/1.0; +https://orank.ai)" \
  "https://www.esdeveniments.cat/" | grep -iE "cf-cache|x-nextjs"

# Must show h1=2 (or more), h2>=3, and no "x-nextjs-postponed" header
curl -sSL \
  -A "Mozilla/5.0 (compatible; ora-scan/1.0; +https://orank.ai)" \
  "https://www.esdeveniments.cat/" | grep -c "<h1"
```

Then re-scan at https://www.orank.ai/score/esdeveniments.cat and confirm
these checks flip to pass: `content-no-js`, `semantic-indexing`,
`content-efficiency`, `sim-chatgpt`, `sim-claude`, `json-ld`.

## Related

- `.github/skills/security-headers-csp/SKILL.md`
- `docs/incidents/2026-04-04-cloudflare-rsc-cache-poisoning.md` (same class
  of issue: CF cache keyed only by URL, served wrong response type)
