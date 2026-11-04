---
name: security-headers-csp
description: How the Content Security Policy (utils/proxy-csp.ts, applied in proxy.ts) and the static security headers (next.config.js headers()) are built, and how to add a third-party script, domain or iframe without breaking the CSP or Core Web Vitals. Use when touching CSP, security headers, script-src/connect-src/frame-src, adding an external script or domain, Google Analytics/AdSense/Funding Choices loading, or JSON-LD output.
---

# Security headers & CSP

Rule (AGENTS.md › Security): the CSP is a relaxed host allowlist with `'unsafe-inline'` so pages stay cacheable (ISR/PPR). No nonces. Backend calls go through `fetchWithHmac`, other outbound calls through `safeFetch`; see the `api-layer-patterns` skill.

## Where it lives

- **CSP**: `buildCsp()` in `utils/proxy-csp.ts` builds the policy once per process (`CSP_VALUE`). `proxy.ts` calls `applyCsp(response)` on HTML page responses only. Routes Proxy skips (API, `/sw.js`, machine-readable routes in the matcher exclusions) send no CSP; they return JSON/text, and a CSP on `/sw.js` would apply to the service worker itself and block Workbox's CDN `importScripts`.
- **Static headers**: `headers()` in `next.config.js` sends the rest of the table below on every response (pages, API, assets, redirects), so no branch can skip them.

Read `buildCsp()` for the current allowlist; don't copy it into docs or other files.

## CSP facts that matter

- `script-src` and `script-src-elem` share one `scriptSources` list, so a new script host goes in once.
- `'unsafe-eval'` is added only when `NEXT_PUBLIC_GOOGLE_ADS` is set (AdSense needs it) and in dev.
- `vercel.live` is added on preview only.
- `connect-src` is `'self'`, the API origin (`getApiOrigin()`), and `https:`. Any HTTPS XHR/fetch target already works.
- `img-src https: data: blob:` and `frame-src 'self' https:` are broad already. New image or iframe hosts usually need no change.
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`.
- The policy is sent as `Content-Security-Policy-Report-Only` when `NEXT_PUBLIC_CSP_REPORT_ONLY=1` or on a Vercel preview. Use that flag to trial a stricter policy without breaking pages.

## Security headers

| Header | Value |
| --- | --- |
| `Content-Security-Policy` (or `-Report-Only`), pages only | `CSP_VALUE` (`utils/proxy-csp.ts`) |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` (matches `frame-ancestors 'self'`) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self)` |

`X-XSS-Protection` is not set on purpose (obsolete). Keep `X-Frame-Options` and `frame-ancestors` in sync.

## Adding a third-party script or domain

1. Ask whether it is needed at all. Every script costs main-thread time; this site is judged on Core Web Vitals.
2. Add the host to `scriptSources` in `buildCsp()` (`utils/proxy-csp.ts`). Add it to `connect-src` only if it is not HTTPS.
3. Load it with `next/script` and the latest strategy that works (`lazyOnload` for analytics). Gate ad/tracking scripts on consent (`useAdContext().adsAllowed`) and on `isProductionHost()`, like `app/GoogleScripts.tsx`.
4. Check the browser console on a real page for CSP violations. Try `NEXT_PUBLIC_CSP_REPORT_ONLY=1` first if unsure.

## Google scripts: where each one loads

These were tuned for Core Web Vitals. Keep each where it is:

| Script | Where | Why |
| --- | --- | --- |
| Funding Choices (consent box) | Plain `<script async src={FUNDING_CHOICES_SRC}>` in the `<head>` of `app/[locale]/layout.tsx`, next to the `googlefcPresent` iframe script | As a `<Script>` in the client tree it waited for hydration and the load event; on a first visit the consent box became the LCP (about 5 s on a slow phone). |
| AdSense | `app/GoogleScripts.tsx` arms the trigger at mount: first tap/key/scroll or `ADS_SCRIPT_FALLBACK_MS` (4.5 s), via `onFirstInteractionOrTimeout` (`utils/browser.ts`), then an idle callback. `app/GoogleScriptsHeavy.tsx` mounts after consent and injects `adsbygoogle.js` once the trigger fired. | Keeps the ads script off the main thread during page load. |
| GA (gtag) | `<Script strategy="lazyOnload">` in `app/GoogleScripts.tsx`, production host only | Not needed until the page is idle. |

`armConsentFallback` (`app/GoogleScripts.tsx`) handles pages where Funding Choices shows no box. Test consent changes against the real FC host, not `localhost`: see LESSONS.md "Funding Choices: `googlefcInactive` is no signal".

## JSON-LD

Render structured data only with `components/partials/JsonLdServer.tsx` (server component). It escapes `</script>` and `<` before `dangerouslySetInnerHTML`. Never hand-roll a `<script type="application/ld+json">`. Internal site paths inside it go through `toLocalizedUrl` (see the `i18n-best-practices` skill); external absolute URLs (images, `sameAs`, ticket links) stay as they are.

## Checklist

- [ ] New script host added to `scriptSources`
- [ ] Script gated on consent / production host if it tracks or serves ads
- [ ] No new `'unsafe-*'` keyword without a reason in a code comment
- [ ] No CSP violations in the console on a real page
- [ ] Static header changes made in `next.config.js` `headers()`, CSP changes in `utils/proxy-csp.ts`, not per route
