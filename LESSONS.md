# LESSONS.md

Repo-specific gotchas worth sharing. Read this during research on any task here.

## A test that skips on its own failure mode is worse than no test

The image-proxy e2e tests skipped on any 502 (`test.skip("Test image service unavailable")`). When the dispatcher broke and 502'd every image, the suite read it as a flaky upstream and shipped green — for weeks (the May 2026 autoSelectFamily regression). If a test exists to catch failure X, it must **fail** on X, never skip. Retry to absorb genuine flakiness, then fail once retries are exhausted. Before trusting a green e2e run, grep for `if (status >= 500) test.skip` shapes.

## `yarn build` does NOT run `prebuild`

Yarn 4 (Berry) dropped automatic `pre*`/`post*` lifecycle scripts — npm runs them, Yarn doesn't. `prebuild` generates `public/sw.js` and `public/robots.txt`, both gitignored. Every deploy path must invoke it explicitly: the Dockerfile/Coolify and CI already do; Vercel needs the `vercel.json` `buildCommand` (`yarn prebuild && yarn build`). The env-specific builds (`build:development|staging|production`) already chain prebuild. A bare `yarn build` ships without the service worker or robots.txt.

## Vercel previews are a preview, not production

Production runs on Coolify/Docker/Node 22; Vercel previews are a different runtime. Sharp is bundled via the Dockerfile and excluded on Vercel — the Sharp e2e test self-skips on `*.vercel.app`. Vercel previews also sit behind a 401 protection wall, so automated probes need the `x-vercel-protection-bypass` secret. A green Vercel preview does not prove production works; gate promotion to `main` on the Coolify/Docker path.

## Image-proxy/dispatcher bugs only surface through a real socket

`buildPinnedDnsDispatcher`'s `lookup` callback runs only when undici opens a real connection — autoSelectFamily (Happy Eyeballs, default since Node 20) calls it with `{ all: true }` and expects an array of records. Mocked-fetch unit tests never reach it. `test/pinned-dns-dispatcher.test.ts` fetches through a loopback server to exercise the real path; keep that style for any proxy or dispatcher change.
