# Project Documentation

Index of `docs/`. Agent rules live in [AGENTS.md](../AGENTS.md) and the skills in
[.claude/skills](../.claude/skills/README.md). Hard-won gotchas live in
[LESSONS.md](../LESSONS.md). Design tokens live in [DESIGN.md](../DESIGN.md).

Finished plans, audits and specs are deleted once shipped; git history keeps
them (`git log --diff-filter=D --name-only -- docs/`).

## Auth & Profiles

- [`logto-auth-setup.md`](./logto-auth-setup.md) — Logto instance/env setup,
  the `LOGTO_*` var table, CI guard. See also the `auth-patterns` skill.

## Incidents

[`incidents/README.md`](./incidents/README.md) indexes postmortems. Read it
before touching CDN caching, ISR/PPR, analytics tags or the Coolify deploy
pipeline.

## Performance

- [`performance/baselines.md`](./performance/baselines.md) — lab and field
  numbers per change, the measuring method and Google tool limits.

## Design

- `DESIGN.md` (repo root) — current design tokens and components. Read first
  for any UI work.
- [`design-rationale.md`](./design-rationale.md) — competitive UI/UX
  benchmarking and card/layout decisions. Screenshots in
  `competitor-screenshots/`.

## Infra & Deploys

- [`ci-build-push-migration.md`](./ci-build-push-migration.md) — build in CI,
  deploy a prebuilt image to Coolify.
- [`self-hosted-resource-limits.md`](./self-hosted-resource-limits.md) —
  Coolify/Hetzner box resource limits.

## Growth

- [`growth/paid-acquisition-research-2026-11.md`](./growth/paid-acquisition-research-2026-11.md)
  — real traffic baseline (bot and Zaraz cleanup), the town-page ranking
  drop, free-first growth plan, ad channel costs and a parked paid test.
- [`growth/festivity-hubs-research-2026-11.md`](./growth/festivity-hubs-research-2026-11.md)
  — festa major hubs: demand (Search Console, Keyword Planner), our data,
  competitors, URL fit, and the plan for Carnaval and Nadal pages.

## Product

- [`strategy-pricing.md`](./strategy-pricing.md) — self-service sponsor
  banner system (`/patrocina`, Stripe checkout and webhook).
- [`restaurant-promotion-implementation.md`](./restaurant-promotion-implementation.md)
  — "Where to eat" section and restaurant promotion flow on event pages.
