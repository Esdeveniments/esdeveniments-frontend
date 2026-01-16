# Agent Skills Index

This directory contains **15 Agent Skills** that guide AI coding agents (GitHub Copilot, Claude, etc.) when working on this project.

## How Skills Work

1. **Discovery**: VS Code loads skill names/descriptions from frontmatter
2. **Activation**: When a task matches a skill, the AI loads the full SKILL.md
3. **Enforcement**: Skills contain checklists and rules the AI must follow

## Available Skills

### Core Development (5)

| Skill                                                                 | Purpose            | Key Rule                        |
| --------------------------------------------------------------------- | ------------------ | ------------------------------- |
| [pre-implementation-checklist](pre-implementation-checklist/SKILL.md) | DRY enforcement    | Search existing patterns FIRST  |
| [type-system-governance](type-system-governance/SKILL.md)             | Type organization  | ALL types in `/types` directory |
| [react-nextjs-patterns](react-nextjs-patterns/SKILL.md)               | Component patterns | Server Component by default     |
| [filter-system-dev](filter-system-dev/SKILL.md)                       | Filter system      | `config/filters.ts` only        |
| [api-layer-patterns](api-layer-patterns/SKILL.md)                     | API architecture   | Three-layer proxy pattern       |

### Infrastructure (4)

| Skill                                                     | Purpose              | Key Rule                                   |
| --------------------------------------------------------- | -------------------- | ------------------------------------------ |
| [url-canonicalization](url-canonicalization/SKILL.md)     | URL/routing rules    | NEVER add `searchParams` to listing pages  |
| [i18n-best-practices](i18n-best-practices/SKILL.md)       | Internationalization | Use `Link` from `@i18n/routing`            |
| [security-headers-csp](security-headers-csp/SKILL.md)     | Security patterns    | Use `fetchWithHmac`, allowlist CSP domains |
| [service-worker-updates](service-worker-updates/SKILL.md) | Service worker       | Edit `sw-template.js`, run `prebuild`      |

### Quality & Testing (3)

| Skill                                                           | Purpose     | Key Rule                            |
| --------------------------------------------------------------- | ----------- | ----------------------------------- |
| [design-system-conventions](design-system-conventions/SKILL.md) | UI styling  | Semantic classes, no `gray-*`       |
| [testing-patterns](testing-patterns/SKILL.md)                   | Testing     | Vitest for unit, Playwright for E2E |
| [bundle-optimization](bundle-optimization/SKILL.md)             | Performance | Quality caps, Server Components     |

### Operations (3)

| Skill                                                         | Purpose          | Key Rule                       |
| ------------------------------------------------------------- | ---------------- | ------------------------------ |
| [env-variable-management](env-variable-management/SKILL.md)   | Environment vars | Update 4 locations             |
| [data-validation-patterns](data-validation-patterns/SKILL.md) | Data validation  | Zod schemas, safe fallbacks    |
| [code-review-evaluation](code-review-evaluation/SKILL.md)     | PR reviews       | Cross-reference against skills |

## Adding a New Skill

### 1. Create Directory Structure

```bash
mkdir -p .github/skills/my-new-skill
touch .github/skills/my-new-skill/SKILL.md
```

### 2. Add Frontmatter (Required for VS Code)

```markdown
---
name: my-new-skill
description: Brief description of when to use this skill. Be specific about triggers.
---

# My New Skill

## Purpose

[What this skill enforces]

## Key Rules

[The critical rules to follow]

## Checklist

- [ ] [Actionable items]
```

### 3. Update System Prompts

Add to the skills table in:

- `.github/copilot-instructions.md`
- `AGENTS.md`

### 4. Test the Skill

Ask the AI: "What skills are available for [your topic]?"

## Skill Structure Best Practices

1. **Start with Purpose** - Why does this skill exist?
2. **Lead with Critical Rules** - Most important constraints first
3. **Include Examples** - Show correct AND incorrect patterns
4. **End with Checklist** - Actionable verification steps
5. **Reference Files** - Link to relevant codebase files

## Frontmatter Schema

```yaml
---
name: skill-name # kebab-case, matches directory
description: > # 1-2 sentences describing triggers
  When to use this skill and what problem it solves.
---
```

## Related Documentation

- [Main Project Documentation](../../docs/README.md) - Project overview and guides
- [Copilot Instructions](../copilot-instructions.md) - AI coding agent guidelines
