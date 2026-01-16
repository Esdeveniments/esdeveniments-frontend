# Claude Code Project Instructions

This project uses the Agent Skills standard for AI coding instructions.

## Quick Reference

See @AGENTS.md for complete project guidelines and the skills reference table.

## Skills Location

All detailed skills are in `.github/skills/*/SKILL.md` - load them based on task:

| Task              | Skill                          |
| ----------------- | ------------------------------ |
| Any new code      | `pre-implementation-checklist` |
| Types/interfaces  | `type-system-governance`       |
| Components        | `react-nextjs-patterns`        |
| Filters           | `filter-system-dev`            |
| API calls         | `api-layer-patterns`           |
| URL/routing       | `url-canonicalization`         |
| i18n/translations | `i18n-best-practices`          |
| Styling/UI        | `design-system-conventions`    |
| Tests             | `testing-patterns`             |
| Security/CSP      | `security-headers-csp`         |
| Service worker    | `service-worker-updates`       |
| Performance       | `bundle-optimization`          |
| Env variables     | `env-variable-management`      |
| API validation    | `data-validation-patterns`     |
| PR review         | `code-review-evaluation`       |

## Critical Rules (Always Apply)

1. **Types in `/types` only** - Never inline types in components
2. **Server Components by default** - Add `"use client"` only at leaves
3. **Use `Link` from `@i18n/routing`** - Never `next/link` directly
4. **Never add `searchParams` to listing pages** - Caused $300 incident
5. **Use semantic design classes** - Never `gray-*` colors

## Workflow

1. Search existing patterns FIRST
2. Propose plan, wait for confirmation
3. Implement following skill checklists
4. Verify: `yarn typecheck && yarn lint`
