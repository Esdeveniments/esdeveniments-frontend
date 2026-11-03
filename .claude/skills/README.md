# Agent Skills Index

15 task guides for AI coding agents (Copilot, Claude Code, Codex, Cursor) working on this repo. Each folder holds a `SKILL.md`. Claude Code and Copilot (CLI, cloud agent, VS Code) discover `.claude/skills` themselves: they load the frontmatter (`name`, `description`) up front and read the full file when a task matches. Agents that don't scan this folder (e.g. Codex) find the skill in the AGENTS.md table and read it. Keep skills here only: a second copy or symlink in `.github/skills` or `.agents/skills` makes Copilot load each skill twice. Repo-wide rules live in [AGENTS.md](../../AGENTS.md); skills add task detail and should not repeat it.

| Skill | Use for | Key rule |
| --- | --- | --- |
| [react-nextjs-patterns](react-nextjs-patterns/SKILL.md) | Pages, components, caching | Server Component by default |
| [filter-system-dev](filter-system-dev/SKILL.md) | Filters | Start in `config/filters.ts`; follow the skill's file list |
| [api-layer-patterns](api-layer-patterns/SKILL.md) | API calls and routes | Three-layer proxy pattern |
| [auth-patterns](auth-patterns/SKILL.md) | Login, session | `useAuth()` / `getAccessTokenFromCookies()` |
| [url-canonicalization](url-canonicalization/SKILL.md) | URLs, routing, redirects | Never read `searchParams` in listing pages |
| [i18n-best-practices](i18n-best-practices/SKILL.md) | Links, translations, locales | `Link` from `@i18n/routing` |
| [design-system-conventions](design-system-conventions/SKILL.md) | Styling, UI | Semantic classes, no `gray-*` |
| [testing-patterns](testing-patterns/SKILL.md) | Unit and E2E tests | Vitest unit, Playwright E2E |
| [verify-que-fer](verify-que-fer/SKILL.md) | Proving a change works | Drive the built app, capture evidence |
| [security-headers-csp](security-headers-csp/SKILL.md) | CSP, scripts, fetch | `fetchWithHmac`, allowlist CSP hosts |
| [service-worker-updates](service-worker-updates/SKILL.md) | Service worker | Edit `public/sw-template.js`, run `yarn prebuild` |
| [bundle-optimization](bundle-optimization/SKILL.md) | Performance, images | Image proxy, one LCP image, server-first |
| [env-variable-management](env-variable-management/SKILL.md) | Env variables | Update all 5 places |
| [data-validation-patterns](data-validation-patterns/SKILL.md) | External data | Zod in `lib/validation/`, safe fallbacks |
| [ai-review-responder](ai-review-responder/SKILL.md) | Handling bot review threads on a PR | Fix or decline, resolve, re-request |

## Adding a skill

1. Create `.claude/skills/<name>/SKILL.md`; the folder name must equal `name`.
2. Write it:

   ```markdown
   ---
   name: my-skill
   description: What it covers and when to use it, with the words a task would contain (files, errors, features). Under 1024 characters.
   ---

   # My Skill

   One line pointing to the relevant AGENTS.md section, then only repo-specific rules, real file paths and real examples to copy.
   ```

3. Keep it short (well under 500 lines). No generic tutorials, no invented code, no "last updated" footers. Link to real tests and files instead.
4. Add a row to the skills table in `AGENTS.md` and to the table above.
