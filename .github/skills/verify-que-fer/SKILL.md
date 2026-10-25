---
name: verify-que-fer
description: Launches the que-fer Next.js app on localhost:3000, drives real user paths with Playwright, and captures evidence. Use before declaring a UI or behavior change done. It is the proof gate; tests and typecheck alone are not proof.
---

# Verify que-fer

Prove behavior against the running app. This drives the real UI the way a user
does and captures the result. It is not a substitute for `yarn test`; it is the
proof that a change works end to end.

## Before you start

- Do not use `next dev` (`yarn dev`) for verification on a 16 GB machine. Its
  Turbopack process reached 2.5-2.8 GB and froze a loaded Mac twice on
  2026-10-24. A production build plus `next start` uses far less and is what
  ships anyway. Check `memory_pressure` first: under 30% free, close apps or
  verify against the deployed staging site. Run one browser at a time and stop
  the server when you finish.
- Use `localhost:3000`, not `127.0.0.1` or another port. The Logto login
  callback is registered only for `http://localhost:3000/api/auth/callback`.

## Launch

From the repo root:

```bash
yarn prebuild                                               # public/sw.js and robots.txt; yarn build does not run it
NEXT_PUBLIC_SITE_URL=http://localhost:3000 yarn build       # inlined at build time
yarn start -p 3000
```

- `NEXT_PUBLIC_SITE_URL` is inlined at build time. Without it the build points
  at the production site, and event pages for preprod events return 404.
- Skip `yarn prebuild` only when the service worker does not matter for the
  change. `public/sw.js` is gitignored, so a fresh clone has none.
- Data needs `HMAC_SECRET` and `BACKEND_SERVICE_SECRET` in `.env.local`.
  `next build` and `next start` run in production mode
  and never read `.env.development`, where `README.md` puts them for `yarn dev`.
  Without them pages render, but external data comes back empty.
- Ready when the home page HTML has the search input:
  ```bash
  curl -s http://localhost:3000/ | grep -c 'data-testid="search-input"'   # expect 1
  ```
- `playwright.config.ts` reuses a server that already answers on the base URL
  (`webServer.reuseExistingServer`). If none answers, it starts `yarn dev`
  itself, so start `yarn start` first, or set `PLAYWRIGHT_TEST_BASE_URL` to a
  deployed site.

## Doctor (run first whenever anything looks off)

```bash
lsof -i :3000 -sTCP:LISTEN     # is the port owned by your dev server?
grep -cE '^(HMAC_SECRET|BACKEND_SERVICE_SECRET)=.+' .env.local   # expect 2; .env.development does not count
yarn --version                 # expect 4.12.x
node --version                 # expect v22; Node 25+ breaks the jsdom localStorage tests
```

## Drive

Two harnesses, both already in the repo.

**1. Playwright E2E (UI paths).** `e2e/**/*.spec.ts`. Stable selectors use
`data-testid`. Run one spec or the smoke test:
```bash
yarn test:e2e e2e/smoke.spec.ts   # home renders and the search input is visible
```
To test a deployed site instead, set the base URL. No local server starts:
```bash
PLAYWRIGHT_TEST_BASE_URL=https://staging.esdeveniments.cat yarn test:e2e e2e/smoke.spec.ts
```

**2. SSR bot check (SEO path).** Fetches the home page with AI crawler user
agents:
```bash
./scripts/verify-ai-bot-ssr.sh [https://www.esdeveniments.cat]
```
Point it at a site behind Cloudflare. On a URL with no `cf-cache-status`
header (such as `localhost`), it stops before printing anything, because
`set -euo pipefail` aborts on the failed `grep`.
The script exits 0 unless a bot gets a cached PPR shell (`cf=HIT` together with
`x-nextjs-postponed`) or a page with no `h1` or `h2`. It prints the JSON-LD
count but does not check it. Read every row yourself: `cf` should be `BYPASS`
or `DYNAMIC`, and `ld` should be at least 1.

## Evidence

Capture the action and the resulting state, not just the final screen.
- Playwright writes failure screenshots and videos to `test-results/` and the
  HTML report to `playwright-report/` (config: `screenshot: only-on-failure`,
  `video: retain-on-failure`, `trace: on-first-retry`).
- SSR script: its stdout table (bot, cf status, h1, h2, ld counts) is the proof.
- For a manual proof, save the output to a scratch path and show it. Do not
  commit proof artifacts unless the change is a large port or migration.

## Cleanup

- Stop the server that listens on the port, then confirm the port is free:
  ```bash
  pid="$(lsof -i :3000 -sTCP:LISTEN -t || true)"
  [ -z "$pid" ] || kill $pid                     # only when the port is yours
  lsof -i :3000 -sTCP:LISTEN                     # expect no output
  ```
  If you started `yarn start &`, also `kill` the PID you saved from `$!`.
  Never kill by bare process name: other que-fer processes may be running.
- `test-results/`, `playwright-report/` and `.next/` are gitignored; leave them.
- The SSR script deletes its temp files only when every request succeeds.

## Feature map

Top user paths, how to reach them, and what observable end state proves them.

| Feature | Reach | Proof |
|---|---|---|
| Home + search | `GET /` | `data-testid="search-input"` visible |
| Event listing | `GET /<place>` (e.g. `/barcelona`) | event cards render, no `$RX` suspense errors |
| Event detail | click an event card | title, date, JSON-LD `Event` block present |
| Filters | listing page, then filters | results update client-side via SWR; date and category go in the path, search and distance in the query (see `url-canonicalization`) |
| News | `GET /noticies/<place>` (e.g. `/noticies/barcelona`) | news cards + JSON-LD present |

## Maintenance

When the app changes (new route, new testid, changed launch), update this skill.
