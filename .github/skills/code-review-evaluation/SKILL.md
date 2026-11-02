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
| Add `next: { revalidate }` to an external fetch | Never: fetch-cache explosion | `api-layer-patterns` |
| Call the backend directly, or use raw `fetch()`/axios | `lib/api` → `app/api` → `*-external.ts`; `fetchWithHmac` / `safeFetch` | `api-layer-patterns`, `security-headers-csp` |
| Skip Zod on external data | Zod in `lib/validation/`, safe fallback | `data-validation-patterns` |
| Add an env var in one place | Update all 5 places | `env-variable-management` |
| Add a barrel `index.ts` | Direct file imports | AGENTS.md › Hard rules |
| `prefetch={true}` on a link | Never (`partialPrefetching`) | `react-nextjs-patterns` |
| Move a script to a Next `<Script>` / change consent loading | Funding Choices stays a plain `<script async>` in `<head>` | AGENTS.md › Performance |
| Use `@types/*` alias instead of `types/*` | `@types/*` clashes with npm type packages | `type-system-governance` |
| Add a new helper | Search for an existing one first | `pre-implementation-checklist` |

Also decline: consolidating queries that need different filters, swapping string ops for a parser on inputs we control, broadening specific `catch` blocks, and splitting small scripts only for style.

## Answer format

```markdown
**[AGREE | PARTIAL | DECLINE]**: <one line on the suggestion>
Reason: <why; name the rule or skill if one applies>
```
