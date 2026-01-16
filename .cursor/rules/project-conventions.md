---
description: Core project conventions for esdeveniments.cat. Apply when working with any code in this repository.
alwaysApply: true
---

# Project Conventions

This project follows the Agent Skills standard. Full documentation in `AGENTS.md` and `.github/skills/`.

## Critical Rules

1. **Types in `/types` only** - ESLint enforces this. Never inline types in components.
2. **Server Components by default** - Add `"use client"` only at leaf components that need client APIs.
3. **Use `Link` from `@i18n/routing`** - Never import from `next/link` directly.
4. **Never add `searchParams` to listing pages** - This caused a $300 DynamoDB cost spike.
5. **Use semantic design classes** - Never use `gray-*` colors, use `foreground`, `muted`, `border` tokens.

## Before Writing Code

1. Search for existing patterns first (`grep_search`, `semantic_search`)
2. Check canonical locations in `types/`, `utils/`, `components/`
3. Propose a plan and wait for confirmation
4. Follow skill checklists in `.github/skills/`

## Key File Locations

- Types: `types/*.ts` (common.ts, props.ts, api/\*.ts)
- Utils: `utils/*.ts` (constants.ts, api-helpers.ts, url-filters.ts)
- Config: `config/*.ts` (filters.ts, categories.ts)
- Components: `components/ui/`, `components/hooks/`

## Verify Changes

```bash
yarn typecheck && yarn lint
```
