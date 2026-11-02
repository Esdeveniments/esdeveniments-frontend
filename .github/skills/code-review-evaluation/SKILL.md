---
name: code-review-evaluation
description: Decide whether to agree with, partially accept or decline a PR review suggestion from bots (Gemini, CodeRabbit, Cubic, Greptile, Pullfrog, Sentry, Copilot) or humans, by checking it against this repo's conventions. Use when asked "do you agree with this suggestion?", to evaluate review comments, or from ai-review-responder before fixing or declining a thread.
---

# Code Review Evaluation

Review bots see the code and are usually right about generic issues. They don't know this repo's rules (AGENTS.md and the skills). Check a suggestion against those rules only when it touches them.

## Default verdicts

| Suggestion | Default |
| --- | --- |
| Bug, type error, missing null check or error handling, edge case | AGREE, fix it |
| Wrong or missing docs/examples, unused code or imports | AGREE |
| Extract a repeated literal, remove duplication, batch API calls | AGREE |
| Too complex (>100-line function, >10 props, >3 levels) | AGREE |
| Accessibility, generic security issue, missing test | AGREE |
| Different pattern, new abstraction, architecture change | CHECK the skills below |
| `useMemo`/`useCallback` without a measured problem | PARTIAL: only if profiling shows it |
| Cosmetic refactor of working code (rename, reorder) | DECLINE: risk without benefit |
| Same suggestion already declined in an earlier round | DECLINE: link the earlier reply |
| Breaks behavior or a project rule | DECLINE: name the rule |

## Project rules bots get wrong

| Suggestion | Our rule | Skill |
| --- | --- | --- |
| Use `next/link` | `Link` from `@i18n/routing` keeps the locale | `i18n-best-practices` |
| Declare a type inline | All types in `types/` (ESLint) | `type-system-governance` |
| Use `gray-*`, hex or arbitrary utilities | Semantic tokens, e.g. `text-muted-foreground` | `design-system-conventions` |
| Read `searchParams` in a listing page | Never: makes pages dynamic ($300+ incident) | `url-canonicalization` |
| Add `next: { revalidate }` to a `fetchWithHmac` call in `lib/api/*-external.ts` | Never: fetch-cache explosion (`revalidate` on same-origin `fetch()` in `lib/api/*.ts` is fine) | `api-layer-patterns` |
| Call the backend directly, or use raw `fetch()`/axios for the backend or other services | `lib/api` → `app/api` → `*-external.ts`; `fetchWithHmac` / `safeFetch`. Plain `fetch()` to same-origin internal routes is fine | `api-layer-patterns`, `security-headers-csp` |
| Skip Zod on external data | Zod in `lib/validation/`, safe fallback | `data-validation-patterns` |
| Add an env var in one place | Update all 5 places | `env-variable-management` |
| Add an `index.ts` re-exporting `"use client"` components used by different routes | Direct file imports (single-component entry points like `components/ui/addToCalendar/index.tsx` are fine) | AGENTS.md › Hard rules |
| `prefetch={true}` on a link | Never (`partialPrefetching`) | `react-nextjs-patterns` |
| Move Funding Choices into a Next `<Script>` or change how consent loads | FC stays a plain `<script async>` in `<head>`. GA keeps `lazyOnload`; AdSense keeps waiting for consent + first interaction | AGENTS.md › Performance |
| Use `@types/*` alias instead of `types/*` | `@types/*` clashes with npm type packages | `type-system-governance` |
| Add a new helper | Search for an existing one first | `pre-implementation-checklist` |

Also decline: consolidating queries that need different filters, swapping string ops for a parser on inputs we control, broadening specific `catch` blocks, and splitting small scripts only for style.

## Answer format

```markdown
**[AGREE | PARTIAL | DECLINE]**: <one line on the suggestion>
Reason: <why; name the rule or skill if one applies>
```
