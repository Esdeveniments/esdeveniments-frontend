---
name: ai-review-responder
description: Evaluate and respond to PR review comments (Gemini, CodeRabbit, Cubic, Greptile, Pullfrog, Sentry, humans) against this repo's rules, then fix or decline, resolve and re-request review. Use when asked to "check comments", "check new suggestions", "respond to AI reviews", or "do you agree with this suggestion?".
---

# AI Review Responder Skill

## Purpose

Automate the full cycle of responding to AI code review comments on GitHub PRs:
**Fetch → Evaluate → Fix/Decline → Resolve → Re-review**

## When to Use

Trigger phrases:
- "check comments", "check new suggestions", "check new comments"
- "respond to AI reviews", "handle review feedback"
- "check PR N for suggestions", "review PR comments"

## Workflow

### Step 1: Identify the PR

- If the user specifies a PR number, use it
- Otherwise, detect from the current branch: `gh pr view --json number --jq .number`
- Get repo owner/name: `gh repo view --json owner,name --jq '"\(.owner.login)/\(.name)"'`

### Step 2: Fetch Unresolved Threads

**IMPORTANT**: Always set `export GH_PAGER=cat` before any `gh api` call to prevent pager issues.

```bash
export GH_PAGER=cat
gh api graphql -f query='
{
  repository(owner: "OWNER", name: "REPO") {
    pullRequest(number: PR_NUMBER) {
      reviewThreads(first: 50) {
        nodes {
          id
          isResolved
          comments(first: 1) {
            nodes {
              createdAt
              author { login }
              path
              line
              body
            }
          }
        }
      }
    }
  }
}' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | {id: .id, author: .comments.nodes[0].author.login, path: .comments.nodes[0].path, line: .comments.nodes[0].line, created: .comments.nodes[0].createdAt, body: .comments.nodes[0].body[0:300]}'
```

If no unresolved threads, report "No new comments" and stop.

### Step 3: Evaluate Each Suggestion

Give each thread a verdict (AGREE / PARTIAL / DECLINE). Read the flagged code before deciding. Bots see the code and are usually right about generic issues; they don't know this repo's rules (AGENTS.md and the skills), so check a suggestion against those rules only when it touches them.

#### Default verdicts

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

#### Project rules bots get wrong

| Suggestion | Our rule | Skill |
| --- | --- | --- |
| Use `next/link` | `Link` from `@i18n/routing` keeps the locale | `i18n-best-practices` |
| Declare a type inline | All types in `types/` (ESLint) | `types/README.md` |
| Use `gray-*`, hex or arbitrary utilities | Semantic tokens, e.g. `text-muted-foreground` | `design-system-conventions` |
| Read `searchParams` in a listing page | Never: makes pages dynamic ($300+ incident) | `url-canonicalization` |
| Add `next: { revalidate }` to a `fetchWithHmac` call in `lib/api/*-external.ts` | Never: fetch-cache explosion (`revalidate` on same-origin `fetch()` in `lib/api/*.ts` is fine) | `api-layer-patterns` |
| Call the backend directly, or use raw `fetch()`/axios for the backend or other services | `lib/api` → `app/api` → `*-external.ts`; `fetchWithHmac` / `safeFetch`. Plain `fetch()` to same-origin internal routes is fine | `api-layer-patterns`, `security-headers-csp` |
| Skip Zod on external data | Zod in `lib/validation/`, safe fallback | `data-validation-patterns` |
| Add an env var in one place | Update all 5 places | `env-variable-management` |
| Add an `index.ts` re-exporting `"use client"` components used by different routes | Direct file imports (single-component entry points like `components/ui/addToCalendar/index.tsx` are fine) | AGENTS.md › Hard rules |
| `prefetch={true}` on a link | Never (`partialPrefetching`) | `react-nextjs-patterns` |
| Move Funding Choices into a Next `<Script>` or change how consent loads | FC stays a plain `<script async>` in `<head>`. GA keeps `lazyOnload`; AdSense keeps waiting for consent + first interaction | AGENTS.md › Performance |
| Use `@types/*` alias instead of `types/*` | `@types/*` clashes with npm type packages | `types/README.md` |
| Add a new helper | Search for an existing one first | AGENTS.md › Workflow |

Also decline: consolidating queries that need different filters, swapping string ops for a parser on inputs we control, broadening specific `catch` blocks, and splitting small scripts only for style.

For a single suggestion ("do you agree?"), answer:

```markdown
**[AGREE | PARTIAL | DECLINE]**: <one line on the suggestion>
Reason: <why; name the rule or skill if one applies>
```

### Step 4: Present Summary Table

Before making changes, present a summary table:

```
| # | Source | Line | Issue | Verdict |
|---|--------|------|-------|---------|
| 1 | Gemini | L594 | Batch API calls | ✅ AGREE — reduces N calls to 1 |
| 2 | Cubic | L88 | Don't exit on error | ❌ DECLINE — rationale here |
```

### Step 5: Apply Fixes

For AGREE and PARTIAL suggestions (PARTIAL: apply only the part you agree with, and say in the thread reply what you left out and why):
1. Read the relevant code sections (parallel reads for efficiency)
2. Make the minimal fix
3. Validate (syntax check, lint, typecheck as appropriate for the language)

Batch all fixes into a single commit:

```bash
git add <files>
git commit -m "fix: address AI review feedback (round N)

- [description of fix 1] (Source)
- [description of fix 2] (Source)"
```

If push is rejected (non-fast-forward), use `git pull --rebase && git push`.

### Step 6: Resolve All Threads

Resolve ALL threads (both fixed and declined) using GraphQL mutation:

```bash
for TID in "THREAD_ID_1" "THREAD_ID_2"; do
  gh api graphql \
    -F tid="$TID" \
    -f query='mutation($tid: ID!) {
      resolveReviewThread(input: {threadId: $tid}) {
        thread { isResolved }
      }
    }' --jq '.data.resolveReviewThread.thread.isResolved'
done
```

### Step 7: Request Re-review

Post a summary comment and trigger review bots:

```bash
gh pr comment PR_NUMBER --body-file - <<'EOF'
Round N: [summary of fixes]. Declined: [summary with rationale].

@coderabbitai review
@gemini review
@cubic-dev-ai review
@greptileai
EOF
```

**Bot trigger commands**:
- CodeRabbit: `@coderabbitai review`
- Gemini: `@gemini review`
- Cubic: `@cubic-dev-ai review`
- Greptile: `@greptileai` (it does not always re-review a push)
- Pullfrog: `@pullfrog` (see below)

**Pullfrog** (`.github/workflows/pullfrog.yml`, docs: https://docs.pullfrog.com/pr-reviews)
re-reviews new commits on its own, and resolving its **last** open thread starts a re-review.
After Step 6 it needs no trigger, so leave `@pullfrog` out of the comment unless neither
happened, or it runs twice. Its threads come from an author whose login contains `pullfrog`.

GitHub Copilot code review is no longer used here; do not request it as a reviewer.

### Step 8: Report Results

Present a final summary table showing all actions taken.

## Efficiency Tips

- **Parallel reads**: Read all flagged code sections in one tool call
- **Batch edits**: Apply all fixes before committing
- **Single commit**: Group all fixes into one commit per round
- **Single resolve loop**: Resolve all thread IDs in one bash call
- **Count rounds**: Track which round this is (check PR comment history)
- **Handle push conflicts**: Always `git pull --rebase` if push fails

## Checklist

- [ ] Set `export GH_PAGER=cat` before GraphQL calls
- [ ] Fetch ALL unresolved threads (not just new ones)
- [ ] Evaluate each thread with the verdict tables in Step 3
- [ ] Present summary table before making changes
- [ ] Validate changes after fixes (syntax, lint, typecheck)
- [ ] Handle `git push` rejection with `--rebase`
- [ ] Resolve ALL threads (fixed AND declined)
- [ ] Include round number in commit and comment
- [ ] Trigger review bots using correct commands (`@gemini review`, not `/gemini review`)
