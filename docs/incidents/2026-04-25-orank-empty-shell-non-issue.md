# Orank "empty shell" report — non-issue (PPR working as designed)

**Date**: 2026-04-25
**Status**: Resolved (no action required)
**Severity**: None — diagnostic only

## TL;DR

Orank.ai reports `content-no-js: 0/3`, `sim-chatgpt: 0/1`, `sim-claude: 0/1`, etc. for esdeveniments.cat, suggesting AI agents see empty HTML. **This is a measurement artifact, not a real problem.** Every named bot we care about (Googlebot, Bingbot, GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot, ora-scan) gets full SSR. The only clients that see the empty PPR shell are real browsers (intentional) and unrecognised generic UAs (orank's scanner among them).

**Do not "fix" this.** The architecture is correct.

## Symptom

Orank scan at https://www.orank.ai/score/esdeveniments.cat shows:

- `content-no-js` 0/3 — "Very little text content (50 chars) - likely JS-rendered, invisible to AI crawlers"
- `semantic-indexing` 0/2 — "Poor indexability: ~13 tokens, 0 headings"
- `content-efficiency` 0/1 — "Very low content efficiency: 0.01% (96 text chars in 776KB HTML)"
- `sim-chatgpt` / `sim-claude` / `sim-ora` / `sim-qwen` / `sim-deepseek` 0/5

These checks claim our site is invisible to AI crawlers.

## Investigation

Probed production homepage with 10 user agents on 2026-04-25:

```bash
for ua in \
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)" \
  "Mozilla/5.0 (compatible; GPTBot/1.0)" \
  "Mozilla/5.0 (compatible; ChatGPT-User/1.0)" \
  "Mozilla/5.0 (compatible; ClaudeBot/1.0)" \
  "Mozilla/5.0 (compatible; PerplexityBot/1.0)" \
  "Mozilla/5.0 (compatible; ora-scan/1.0)" \
  "Mozilla/5.0 (compatible; OrankBot/1.0)" \
  "node-fetch" \
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"; do
  curl -sS -D /tmp/h.txt -o /tmp/b.html -H "User-Agent: $ua" "https://www.esdeveniments.cat/"
  # Inspect cf-cache-status, x-nextjs-postponed, h1 count, visible text
done
```

Result:

| UA                        | cf-cache-status | postponed | size      | h1 | visible text | verdict   |
| ------------------------- | --------------- | --------- | --------- | -- | ------------ | --------- |
| Googlebot                 | DYNAMIC         | 0         | 1,368,208 | 3  | 10,005       | ✅ Full SSR |
| Bingbot                   | DYNAMIC         | 0         | 1,368,208 | 3  | 10,005       | ✅ Full SSR |
| GPTBot                    | DYNAMIC         | 0         | 1,368,208 | 3  | 10,005       | ✅ Full SSR |
| ChatGPT-User              | DYNAMIC         | 0         | 1,368,208 | 3  | 10,005       | ✅ Full SSR |
| ClaudeBot                 | DYNAMIC         | 0         | 1,368,208 | 3  | 10,005       | ✅ Full SSR |
| PerplexityBot             | DYNAMIC         | 0         | 1,368,208 | 3  | 10,005       | ✅ Full SSR |
| ora-scan                  | DYNAMIC         | 0         | 1,368,208 | 3  | 10,005       | ✅ Full SSR |
| OrankBot (guess)          | HIT             | 1         | 791,160   | 0  | 103          | ❌ Shell   |
| node-fetch                | HIT             | 1         | 791,160   | 0  | 103          | ❌ Shell   |
| Browser (Safari)          | HIT             | 1         | 791,160   | 0  | 103          | ❌ Shell   |

## Root cause

Orank's scanner uses an unrecognised UA, so:

1. `proxy.ts` doesn't append `Slurp` (only matches the `AI_BOT_UA_RE` list) → Next.js's `getBotType()` doesn't classify it as a bot.
2. Cloudflare Cache Rule for bot UAs doesn't fire → CF serves the cached PPR shell.
3. The PPR shell is intentionally minimal (Suspense placeholders) — JS hydrates the rest for real users.

Orank then reports "no content found" and uses this as a proxy for "AI agents can't see the site". But real AI agents (GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot, ora-scan) all get full SSR through the bot UA path verified above.

## Why the architecture is correct

The system is the current 2026 best practice:

- **Next.js 16.2 + PPR + `cacheComponents`** — Vercel-recommended for content sites.
- **`htmlLimitedBots` regex** — Vercel's official mechanism (introduced 15.2) to force blocking renders for bots.
- **Slurp trick in `proxy.ts`** — works around Next.js's hardcoded `getBotType()` not recognising newer AI bot UAs (GPTBot, ChatGPT-User, etc.).
- **Cloudflare Cache Rule bypassing cache for bot UAs** — standard CDN pattern.
- **Static PPR shell from CDN edge** — gives real users <50ms TTFB.

Trade-off: clients that don't identify as bots AND don't run JS see only the shell. This is a known PPR consequence and affects ~0.1–0.3% of real traffic (JS-disabled browsers), all of whom get the `<noscript>` fallback content already in `app/[locale]/page.tsx`.

## Decision

**No code changes.** Closing out as documentation only.

### What NOT to do

These have been proposed and rejected:

- ❌ **`htmlLimitedBots: /.*/`** — disables streaming for all users, regresses TTFB ~200ms, defeats the purpose of PPR.
- ❌ **Disable `cacheComponents`** — loses PPR + risks reintroducing the 776 Sentry tree-mismatch errors documented in repo memory (`/memories/repo/cacheComponents-determinism.json`).
- ❌ **Move `<HomeStaticFallback>` above the Suspense boundary** to fill the shell — would help orank's score but provide zero benefit to real bots (which already see full content) or real users (who already get fast hydration). Optimising for a third-party scanner's measurement artifact is the wrong priority.
- ❌ **Add `bot|crawler|scanner` to `AI_BOT_UA_RE`** — too broad; would catch internal monitoring tools and break their cache.

### What we already did (kept)

- Wikidata Q139549463 in Organization sameAs.
- Trimmed JSON-LD to schema.org-validated fields only.
- Cloudflare Cache Rule: bypass cache for 25 bot UAs.
- robots.txt: 7 AI training crawlers unblocked, 3 dataset resellers (CCBot, Bytespider, Omgilibot) blocked.

## Verification

Re-run this if doubt arises:

```bash
for ua in "GPTBot/1.0" "ChatGPT-User/1.0" "ClaudeBot/1.0" "PerplexityBot/1.0" "Googlebot/2.1"; do
  echo "=== $ua ==="
  curl -sS -D - -o /tmp/b.html -H "User-Agent: Mozilla/5.0 (compatible; $ua)" \
    "https://www.esdeveniments.cat/" | grep -iE "cf-cache-status|x-nextjs-postponed"
  grep -c '<h1' /tmp/b.html
done
```

Expected output for every bot: `cf-cache-status: DYNAMIC`, `x-nextjs-postponed: 0`, `h1 count: 3`.

If any bot shows `cf-cache-status: HIT` + `postponed: 1`, the bot UA path is broken and needs investigation. Likely cause: missing UA in `AI_BOT_UA_RE` (`proxy.ts`) or in the Cloudflare Cache Rule.

## Lessons learned

- Third-party scanner scores measure what their scanner sees, not what the actual ecosystem sees. Validate empirically before optimising for a number.
- "AI agent accessibility" is a non-technical claim that breaks down on inspection — there are dozens of UAs and proxies, no scanner can simulate them all.
- Empty PPR shells are a feature for real users (fast TTFB) and a cost for unrecognised scanners. The right trade-off depends on traffic mix; for us, browsers + named bots are 99.9%+ of meaningful traffic.

## Related

- `/memories/repo/cacheComponents-determinism.json` — why we can't disable cacheComponents lightly
- `/memories/repo/ppr-streaming-pattern.md` — earlier (incomplete) attempt to put SEO content in Suspense fallbacks
- `docs/incidents/2026-04-24-ai-bot-cdn-cache-mix.md` — the Cloudflare Cache Rule that fixed the original AI bot caching issue
- `proxy.ts` — `AI_BOT_UA_RE` regex + Slurp trick + bot Cache-Control headers
- `next.config.js` — `htmlLimitedBots` regex (extends Next.js default with AI bots)
