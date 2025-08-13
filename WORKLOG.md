## Auth, Accounts, Events Ownership MVP – Worklog

### Completed
- **Mocked login/signup (now cookie-based)**
  - `POST /api/auth/signup` (with Turnstile, rate limit, CSRF)
  - `POST /api/auth/login` (rate limit, CSRF)
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- **Passwordless magic links**
  - `POST /api/auth/magic/request` (Turnstile + rate limit + CSRF) → returns dev `verifyUrl`
  - `GET /api/auth/magic/verify?token=...` → sets `session` cookie
- **Google OAuth (basic)**
  - `GET /api/auth/google` → start; `GET /api/auth/google/callback` → session
  - Login UI button: "Continua amb Google"
- **Server-side protection**
  - `middleware.ts`: redirects unauthenticated `/dashboard/*` → `/auth/login`
  - `app/e/[eventId]/edita/page.tsx`: server ownership check (redirect/notFound)
- **Ownership and favorites persisted via API (JSON store)**
  - Ownership: `GET/POST /api/user/events`, `DELETE /api/user/events/[slug]`
  - Favorites: `GET /api/user/favorites`, `POST /api/user/favorites/toggle`
- **Event page UI**
  - Restored native/static share buttons and `ViewCounter`
  - Added `FavoriteButton` (uses API; redirects to login on 401)
  - Owner-only "Edita" in `EventHeader` when user owns the event
- **Dashboard**
  - `My events`: titles + edit/delete links
  - `Favorites`: titles listed
  - `New event`: reuses form, persists ownership via API
  - `Account`: sessions list + revoke; export data; delete account
- **Security**
  - Turnstile widget: `components/ui/Turnstile.tsx`; server verify helper: `app/api/auth/turnstile.ts`
  - Rate limit + CSRF helpers: `app/api/utils/security.ts`
  - Sessions include expiry; cookie is httpOnly, SameSite=Lax
- **Storage (MVP)**
  - `.data/db.json` structure extended for: users, sessions (TTL), ownership, favorites, co-owners, magic tokens, delete requests, oauth states

### Key Files/Dirs
- Auth API: `app/api/auth/*`
- User API: `app/api/user/*`
- Event UI: `app/e/[eventId]/*`
- Dashboard: `app/dashboard/*`
- JSON DB: `lib/server/db.ts` (helpers), `.data/db.json`
- Security: `middleware.ts`, `app/api/utils/security.ts`

### Environment
- **Google OAuth**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- **Turnstile**: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`

### Remaining / Next Steps
- **Auth**
  - Add session rotation/refresh and idle/absolute timeouts; "Remember me" duration option.
  - Add email delivery for magic links (SMTP provider) and production email templates.
  - Add Apple/GitHub providers if needed.
- **Account**
  - Profile edit: name/email change with re-verification; avatar upload.
  - Session device metadata (agent/IP) and display in `Account` page.
- **Events Ownership**
  - Co-owner invitations (email/magic accept), UI to manage co-owners; endpoints for `addCoOwner`, `listCoOwners`.
  - Owner delete flow: surface `POST /api/user/delete-requests` in UI, admin review tooling.
- **Admin Tools (future)**
  - Admin role support and UI for: delete-requests review, user management, event moderation.
- **Security Hardening**
  - Per-user + per-IP rate limits (consider Redis) and sliding windows.
  - CSRF tokens for state-changing requests (double-submit or SameSite+origin checks combined).
  - Brute-force and abuse monitoring; add Turnstile to login endpoint if abused.
  - Strict CSP adjustments for Google OAuth domains if needed.
- **DX/Quality**
  - Add integration/e2e tests (Playwright) for signup/login (magic + Google), protected routes, favorites, ownership.
  - Telemetry/logging for auth flows (redact PII), alerting on spikes.
- **Persistence**
  - Migrate from JSON store to real DB or existing backend API; add migration script.

### Notes
- All new features are MVP-level and designed to be easily swapped to a real DB/email provider.
- Server redirects protect dashboard and editing regardless of client state.
- The share/view counter UI remains unchanged; favorites and owner actions are non-breaking additions.