# Backend contract v2 migration (PRE, 2026-10-18)

## Source

Backend handoff from Gerard (Spring Boot, `esdeveniments-backend` `origin/develop`,
merged PR #47 `feature/stripe-news`). Checklist of 14 frontend changes: rename
`organizerVerified`, add `role`, drop event `type`, add `isPromoted`, multipart
create, new cover-image endpoints, optional event URL, promotions listing and
checkout, `/promote/success|cancel` routes, drop old checkout, `X-Backend-Key`
instead of HMAC, nullable `imageUrl`/`avatarUrl`, promotion error format.

## Scope split

- **PR A (this branch, `feat/backend-contract-v2`)**: items 1-8, 12, 13.
- **PR B (on top of PR A, reuses PR #447 UI)**: items 9, 10, 14 and the
  `isPromoted` badge.
- Item 11 is a no-op: no frontend code calls `/api/payments/create-checkout-session`.

## PR A approach

1. Outbound auth: `fetchWithHmac` sends `X-Backend-Key` from the server-only
   `BACKEND_SERVICE_SECRET` (same name as the backend env var). It keeps
   sending the HMAC headers while `HMAC_SECRET` is set, because prod backend
   (`main`) still verifies HMAC. Delete the HMAC headers when prod backend ships v2.
   The internal `/api/*` HMAC gate (`utils/api-gate.ts`) is frontend-only and
   stays.
2. Zod + types: drop `type` (it was required, so every PRE event failed to
   parse), `url` nullable, add `isPromoted`, `organizerVerified` -> `verified`,
   `role` on owner and public user.
3. Create: server action receives a `FormData` (event JSON + optional
   `imageFile`) and forwards multipart to `POST /api/events`: `event` part as
   `application/json` Blob, no manual `Content-Type`, `categories: []` when empty.
4. Edit: JSON `PUT /api/events/{uuid}` without `type`/`imageUrl`. Cover changes
   go through `PUT|DELETE /api/events/{uuid}/image` in the same server action.
5. Remove the image-URL input, `/api/publica/image-upload`, the client XHR
   uploader, and `POST /api/events/images`. Accept JPEG/PNG only.
6. Env plumbing: Dockerfile ARG, workflows, `.env.example`, health check, test seed.

## Not changed

- No R2 host allowlist: CSP `img-src` allows `https:` and the image proxy has
  no host allowlist. Loopback (local Floci) is allowed in dev.
- No `/cdn-cgi/image` rewriting (optional in the handoff).

## Blockers for the backend

- Sponsor banner upload (`app/api/sponsors/image-upload`) used the removed
  `POST /api/events/images`. The backend has no non-event image endpoint now.
- Stripe redirects go to `{PROMOTIONS_FRONTEND_BASE_URL}/e/{slug}/promote/...`;
  PRE defaults that to `http://localhost:3000`.
- Prod sets no `PROMOTIONS_ENABLED`, so promotions are off there by default.
