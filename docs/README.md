# Project Documentation

Index of `docs/`. For AI agent skills (the day-to-day "how do I build X in
this codebase" guides), see `.github/skills/*/SKILL.md` — indexed from
`AGENTS.md`'s skill table, not here.

## Auth & Profiles

- [`logto-auth-setup.md`](./logto-auth-setup.md) — Logto instance/env setup,
  the `LOGTO_*` var table, CI guard. Also see the `auth-patterns` skill for
  the OIDC flow and `useAuth()` contract.
- [`api-spec-profiles.md`](./api-spec-profiles.md) — backend profile API
  contract (fields, endpoints) the frontend integrates against.
- [`plans/2026-05-26-user-favorites-sync.md`](./plans/2026-05-26-user-favorites-sync.md)
  — guest-to-account favorites migration design.
- [`plans/2026-07-30-profile-events-split.md`](./plans/2026-07-30-profile-events-split.md)
  — the active/past events tab split on profile pages.

## Incidents

[`incidents/README.md`](./incidents/README.md) indexes postmortems —
Cloudflare RSC cache poisoning, Coolify PR-preview empty HTML, AI-bot CDN
cache mixing, Redis stale prerenders, Cache Components metadata mismatch,
Places API cost, PR-review-loop missed threads. Read before touching CDN
caching, ISR/PPR, or the Coolify deploy pipeline.

## Design

- [`design-system-overview.md`](./design-system-overview.md) — the semantic
  design-token system (typography, color, buttons, cards, spacing) and how
  it replaced ad-hoc Tailwind classes.
- [`implementation-reference.md`](./implementation-reference.md) — the full
  code reference for those tokens (`tailwind.config.js`, `globals.css`,
  class-by-class migration notes).
- [`reference-data.md`](./reference-data.md) — lookup tables from that
  migration (gray→semantic color mapping, component inventory).
- [`design-rationale.md`](./design-rationale.md) — competitive UI/UX
  benchmarking and card/layout decisions. Screenshots in
  `competitor-screenshots/`.

Current design tokens live in `DESIGN.md` at the repo root — read that first
for any new UI work. `design-system-overview.md`, `implementation-reference.md`,
and `reference-data.md` are the historical record of how the token system got
there, not the day-to-day reference. `design-rationale.md` is a separate,
still-relevant competitive-UX reference, not part of that migration history.

## Infra & Deploys

- [`ci-build-push-migration.md`](./ci-build-push-migration.md) — build in CI,
  deploy a prebuilt image to Coolify.
- [`self-hosted-resource-limits.md`](./self-hosted-resource-limits.md) —
  Coolify/Hetzner box resource limits.
- [`streaming-refactor-findings-2026-04.md`](./streaming-refactor-findings-2026-04.md)
  — notes from the streaming/PPR refactor.

## Product / Growth

- [`restaurant-promotion-implementation.md`](./restaurant-promotion-implementation.md)
  and [`restaurant-promotion-schema.md`](./restaurant-promotion-schema.md) —
  restaurant promotion feature implementation + DB schema.
- [`strategy-pricing.md`](./strategy-pricing.md) — self-service sponsor
  banner system.
- [`seo-audit-2026-03-09.md`](./seo-audit-2026-03-09.md),
  [`seo-audit-2026-05-18.md`](./seo-audit-2026-05-18.md) — SEO/GSC audits.
- [`performance-assessment-2026-03.md`](./performance-assessment-2026-03.md)
  — Core Web Vitals / performance audit.

## Design specs (in-flight work)

`superpowers/specs/` holds dated design docs written before implementation
(spec → plan → build). Check there for the most recent feature designs.
