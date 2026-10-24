---
name: verify-que-fer
description: Launches the que-fer Next.js app on localhost:3000, drives real user paths with Playwright, and captures evidence. Use before declaring a UI or behavior change done. It is the proof gate; tests and typecheck alone are not proof.
---

# Verify que-fer

Prove behavior against the running app. This drives the real UI the way a user
does and captures the result. It is not a substitute for `yarn test`; it is the
proof that a change works end to end.

## Launch

```bash
cd ~/Repos/que-fer
yarn dev   # Next.js dev server on http://localhost:3000 (runs prebuild → generates sw.js)
```

- Requires `.env.development` with at least `HMAC_SECRET` (pages still render
  without the production secret; external data comes back empty).
- Readiness signal: the URL answers and the home page shows the search input.
  ```bash
  curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:3000/   # expect 200
  ```
- The Playwright config (`playwright.config.ts`) auto-starts the dev server via
  `webServer.reuseExistingServer`, so an existing dev server is reused.

- Use `localhost:3000`, not `127.0.0.1` or another port: the Logto login
  callback is registered only for `http://localhost:3000/api/auth/callback`.
- Check memory first. `next dev` plus a Playwright Chromium needs several GB.
  On a loaded 16 GB Mac this froze the machine (2026-10-24). If
  `memory_pressure` reports under 30% free, close apps first, or verify against
  the deployed staging site instead of a local server. Run one browser at a
  time and stop the dev server when you finish.

## Doctor (run first whenever anything looks off)

```bash
lsof -i :3000 -sTCP:LISTEN          # is the port owned by our dev server?
grep -c HMAC_SECRET .env.development  # >= 1, otherwise external fetches 401
yarn --version                       # expect 4.12.x
node --version                       # expect v22
```

## Drive

Two harnesses, both already in the repo:

**1. Playwright E2E (UI paths).** `e2e/**/*.spec.ts`. Stable selectors use
`data-testid`. Run one spec or the smoke test:
```bash
yarn test:e2e -- e2e/smoke.spec.ts        # home renders + search input visible
```
Remote target instead of local: `PLAYWRIGHT_TEST_BASE_URL=https://... yarn test:e2e`.

**2. SSR bot check (SEO path).** Drives production HTML for AI crawlers:
```bash
./scripts/verify-ai-bot-ssr.sh [https://www.esdeveniments.cat]
```
Passes when every bot UA gets full SSR: `cf-cache-status` is BYPASS/DYNAMIC,
`h1 >= 1`, `h2 >= 1`, `json+ld >= 1`.

## Evidence

Capture the action and the resulting state, not just the final screen:
- Playwright: screenshots/videos are written to `playwright-report/` on failure
  (config: `screenshot: only-on-failure`, `video: retain-on-failure`, `trace: on-first-retry`).
- SSR script: its own stdout table (bot, cf status, h1/h2/ld counts) is the proof.
- For a manual proof, save the transcript to a scratch path and keep it visible;
  do not commit proof artifacts unless the change is a large port/migration.

## Cleanup

- `yarn dev` spawns a child `next dev` process; killing the `yarn` PID leaves it
  orphaned. Kill the whole process group you started:
  ```bash
  # capture the PGID when launching: setsid yarn dev &   (macOS: use nohup … &)
  lsof -i :3000 -sTCP:LISTEN -t | xargs kill   # only when the port is yours
  ```
  Then confirm the port is free. Never kill by bare process name: other
  que-fer processes may be running.
- `playwright-report/` and `.next/` are gitignored build output; leave them.
- The SSR script cleans its own temp files.

## Feature map

Top user paths, what to reach them, and what observable end state proves them.

| Feature | Reach | Proof |
|---|---|---|
| Home + search | `GET /` | `data-testid="search-input"` visible |
| Event listing | `GET /<place>` (e.g. `/barcelona`) | event cards render, no `$RX` suspense errors |
| Event detail | click an event card | title, date, JSON-LD `Event` block present |
| Filters | listing page → filters | results update client-side via SWR, URL stays clean |
| News | `GET /<place>/noticies` | news cards + JSON-LD present |

## Maintenance

When the app changes (new route, new testid, changed launch), update this skill.
