# Incident: Cloudflare Managed WAF Blocked `POST /publica` Server Action (HTTP 403)

**Date:** 2026-11-19 (diagnosed and mitigated 2026-11-24)  
**Severity:** High (blocked a real organizer from publishing)  
**Status:** Mitigated (Cloudflare WAF Skip rule active; long-term fix is moving binary image uploads off Server Actions to `/api/*` Route Handlers)

## Summary

A real organizer (`Cine-Club d'Argentona`, `/perfil/jbuera`) tried to publish an event on `www.esdeveniments.cat/publica` on 2026-11-19 and hit **59 consecutive Cloudflare HTTP 403 blocks** across 13 minutes (50 recorded as `publish_error` with `reason=generic` in GA4; 3 captured in Sentry `JAVASCRIPT-NEXTJS-54` across 3 page loads).

Every blocked request was a false positive from Cloudflare's **Free Managed Ruleset** (`77454fe2d30c4220b5701f6fdfb893ba`), rule `3114709a3c3b4e3685052c7b251e86aa`: **`React - Leaking Server Functions - CVE:CVE-2025-55183`**. The site runs `next@16.4.6` and `react@19.3.1`, which are already patched against CVE-2025-55183.

## Impact

- 1 real organizer (`Cine-Club d'Argentona`) failed 59 times across 13 minutes, logged out and back in, checked their profile twice, and abandoned `/publica` with 0 events published on that account.
- GA4 weekly dashboard (#871) reported 50 `publish_error` (`generic`) events and 3 submit-button rage-clicks.
- Requests were rejected at Cloudflare's edge in 79–227 ms and never reached Next.js, leaving zero server-side Sentry or backend errors.

## Timeline (2026-11-19, UTC; CET = UTC+1)

- **17:00 UTC**: Organizer lands on `www.esdeveniments.cat/`, signs in (`17:10`), completes profile (`/perfil/edita`, `17:12`), opens `/publica` (`17:12`).
- **17:19:33 UTC**: Prepares JPEG poster (`poster_image_prepared`).
- **17:19:45 UTC**: Clearing/editing `input#event-date-end-time` triggers an unrelated unhandled `RangeError: Invalid time value` (`JAVASCRIPT-NEXTJS-53`) in `DatePickerImpl`.
- **17:19:59 UTC**: First submit (`POST /publica`) returns **HTTP 403** from Cloudflare (`React - Leaking Server Functions - CVE:CVE-2025-55183`). Next.js client throws `Error: An unexpected response was received from the server.` (`JAVASCRIPT-NEXTJS-54`).
- **17:20–17:32:51 UTC**: 58 more retries (including after reloading, re-authenticating, and toggling all-day) all hit the exact same WAF rule because the persisted publish draft resent the same poster image and form text.
- **17:33 UTC**: User abandons `/publica`.
- **2026-11-24**: Triangulated across GA4, Sentry breadcrumbs (`POST 403 /publica` in 79 ms), and Cloudflare firewall event exports (`59x block`, rule `3114709a3c3b4e3685052c7b251e86aa`). Deployed Cloudflare Custom Rule #4 (`Skip → All managed rules` on `POST` `/publica` and `/e/*/edita`) and verified live with a synthetic `Next-Action` + `"$F1"` probe (`400` from Next.js on `/publica`, `/es/publica`, `/e/test-slug/edita`; `403` preserved on `/`).

## Root Cause

1. **False positive in Cloudflare Free Managed Ruleset (`CVE-2025-55183`)**: CVE-2025-55183 only affects React `19.0.0–19.2.1` and Next.js `15.x`–`16.0.9` (our app is on `next@16.4.6` + `react@19.3.1`). Cloudflare's emergency rule scans `Next-Action` multipart `FormData` bodies for React Flight reference tokens (`$F`/`$@`/etc.). Because `createEventAction` sends raw binary JPEG bytes + user JSON inside a Server Action `FormData` POST, random bytes in a user's poster image (or a `$` sequence in their text) match the rule.
2. **Same risk on `/e/<slug>/edita`**: Auditing all 4 `"use server"` files in the codebase showed `editEvent` (`app/[locale]/e/[eventId]/edita/actions.ts`) uses the exact same `FormData` + `imageFile` Server Action pattern. (`translateDescription` and `promote/actions.ts` send only short IDs/slugs; avatar, poster-autofill, and sponsor uploads already use `/api/*` Route Handlers.)
3. **Opaque error on the client**: Because Cloudflare returns a 403 HTML block page instead of an RSC stream, Next.js throws `"An unexpected response was received from the server."`, which `PublishForm` classifies as `publish_error` (`reason: generic`).

## Resolution

- **Immediate (Cloudflare Security → Custom rules, Rule #4, ordered below bot/threat/country blocks #1–#3):**
  - Action: `Skip` → **All managed rules** (keeping custom rules, threat challenge, bot blocks, and rate limiting active).
  - Recommended expression (Free-plan compatible, covers all locales for `/publica` and `/e/<slug>/edita` while excluding `/perfil/edita`):
    ```
    (http.host eq "www.esdeveniments.cat" and http.request.method eq "POST" and any(http.request.headers["next-action"][*] ne "") and (ends_with(http.request.uri.path, "/publica") or (http.request.uri.path contains "/e/" and ends_with(http.request.uri.path, "/edita"))))
    ```
- **Secondary issues uncovered and fixed in the same investigation:**
  - `DatePickerImpl.tsx`: guarded `handleStartTimeChange` / `handleEndTimeChange` with `parseTime()` and `toDate()` with an `Invalid Date` fallback (`JAVASCRIPT-NEXTJS-53`).
  - `app/[locale]/publica/actions.ts`: replaced legacy Vercel `env === "prod"` check in `sendNewEventEmail()` with shared `isProductionDeploymentRequest()` (`lib/production-request.ts`, reused by `lib/seo/indexnow.ts`) and blanked `NEW_EVENT_EMAIL_URL` on Coolify `esdeveniments-staging` so staging publishes never trigger production notification emails.
  - `utils/constants.ts`, `lib/seo/sitemap-chunks.ts`, `app/rss.xml/route.ts`: capped `GET /api/events` `size` to `BACKEND_EVENTS_MAX_PAGE_SIZE = 100` to match the backend's `size <= 100` validation rule (`400 GET /api/events Validation failed - size: must be less than or equal to 100`).

## Prevention

- **Do not upload binary files (`File` / `FormData` images) through Next.js Server Actions (`"use server"`).** Use regular `/api/*` Route Handlers (like `/api/users/me/avatar` and `/api/publica/poster-autofill`), which carry no `Next-Action` header, are locale-agnostic, return real HTTP statuses, and never collide with React/RSC Flight WAF rules.
- Migrate `createEventAction` (`/publica`) and `editEvent` (`/edita`) image uploads to `/api/*` Route Handlers, then remove Cloudflare Rule #4 so 100% of Managed WAF stays active on every route.

## Lessons Learned

- A `POST 403` returning in <250 ms with Next.js client error `"An unexpected response was received from the server."` and zero origin/server Sentry logs points straight to a Cloudflare WAF block at the edge — check **Cloudflare Security → Events** first.
- Never check `env === "prod"` (`utils/misc-helpers.ts`) for production-only side effects on Coolify: `NODE_ENV` is `"production"` on staging and `NEXT_PUBLIC_VERCEL_ENV` is unset. Always use `isProductionDeploymentRequest()` (`lib/production-request.ts`).
