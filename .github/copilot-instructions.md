# Copilot instructions

The full rules for this repo are in `AGENTS.md` at the repo root, and the how-to guides are in `.claude/skills/*/SKILL.md`. Copilot's cloud agent, CLI, code review and VS Code chat read `AGENTS.md` directly; this file only exists for Copilot surfaces that don't (github.com chat, JetBrains, Visual Studio, Xcode). Don't add rules here: add them to `AGENTS.md`.

The rules that most often break things:

- Never read `searchParams` in listing pages (`app/[locale]/[place]/**`); query filters are client-side (SWR).
- Never add `next: { revalidate, tags }` to `fetchWithHmac` calls in `lib/api/*-external.ts`.
- New endpoints: pages → `lib/api/*.ts` → `app/api/*` → `lib/api/*-external.ts` (`fetchWithHmac`, Zod, safe fallback); AGENTS.md › API layer lists the existing readers that differ. `lib/api` readers that run during `next build` need the `isBuildPhase` bypass.
- All types in `types/`. No `any`. No local barrel files that mix `"use client"` components from different routes.
- Server Components by default; `"use client"` only at leaves. Never `prefetch={true}` on links.
- Internal links: `Link` from `@i18n/routing`. Text in `messages/*.json`.
- UI: semantic classes and tokens from `DESIGN.md`; never `gray-*`.
- Don't move the Funding Choices `<script async>` out of the `<head>` in `app/[locale]/layout.tsx`.
- Verify with `yarn lint && yarn typecheck && yarn test`.
