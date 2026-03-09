---
name: ai-review-responder
description: Automate responding to AI code review comments (Gemini, CodeRabbit, Cubic, Sentry) on PRs. Use when asked to "check comments", "check new suggestions", or "respond to AI reviews".
---

# AI Review Responder Skill

## Purpose

Automate the full cycle of responding to AI code review comments on GitHub PRs:
**Fetch → Evaluate → Fix/Decline → Resolve → Re-review**

This skill codifies the workflow for handling suggestions from Gemini, CodeRabbit, Cubic, Sentry, and other AI review bots.

## When to Use

Trigger phrases:
- "check comments", "check new suggestions", "check new comments"
- "respond to AI reviews", "handle review feedback"
- "check PR N for suggestions", "review PR comments"

## Workflow

### Step 1: Fetch Unresolved Threads

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

**IMPORTANT**: Always set `export GH_PAGER=cat` before any `gh api` call to prevent pager issues.

### Step 2: Evaluate Each Suggestion

For each unresolved thread, use the `code-review-evaluation` skill's decision tree:

| Category | Default | Action |
|----------|---------|--------|
| Bug/error fix | AGREE ✅ | Fix it |
| Missing docs/fields | AGREE ✅ | Fix it |
| Unused code cleanup | AGREE ✅ | Fix it |
| Code quality (extract constant, reduce duplication) | AGREE ✅ | Fix it |
| Trailing newline, encoding | AGREE ✅ | Fix it |
| Edge case handling (null check, mkdir, try/catch) | AGREE ✅ | Fix it |
| Pattern/architecture change | CHECK SKILLS | Cross-reference project skills |
| Cosmetic refactor (rename, reorder, simplify working code) | DECLINE ❌ | Resolve with rationale |
| Repeat suggestion (already declined) | DECLINE ❌ | Resolve, reference prior decision |
| Suggestion that breaks functionality | DECLINE ❌ | Resolve with explanation |

### Step 3: Present Summary Table

Before making changes, present a summary table to the user:

```
| # | Source | Line | Issue | Verdict |
|---|--------|------|-------|---------|
| 1 | Gemini L594 | Batch API calls | ✅ AGREE — reduces N calls to 1 |
| 2 | Cubic L88 | Don't SystemExit | ❌ DECLINE — can't run without creds |
```

### Step 4: Apply Fixes

For agreed suggestions:
1. Read the relevant code section
2. Make the minimal fix
3. Validate syntax (e.g., `python3 -c "import ast; ast.parse(open('file').read())"`)

Batch all fixes into a single commit:

```bash
git add <files>
git commit -m "fix: address AI review feedback (round N)

- [description of fix 1] (Source)
- [description of fix 2] (Source)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

If push is rejected (non-fast-forward), use `git pull --rebase && git push`.

### Step 5: Resolve All Threads

Resolve ALL threads (both fixed and declined) using GraphQL mutation:

```bash
for TID in "THREAD_ID_1" "THREAD_ID_2"; do
  gh api graphql -f query="
    mutation {
      resolveReviewThread(input: {threadId: \"$TID\"}) {
        thread { isResolved }
      }
    }" --jq '.data.resolveReviewThread.thread.isResolved'
done
```

### Step 6: Request Re-review

Post a summary comment and trigger all review bots:

```bash
gh pr comment PR_NUMBER --body "Round N: [summary of fixes]. Declined: [summary of declines with rationale].

@coderabbitai review
/gemini review
@cubic-dev-ai review"
```

### Step 7: Report Results

Present a final summary table showing all actions taken.

## Evaluation Rules (Project-Specific Declines)

These suggestion patterns should ALWAYS be declined per our project conventions:

### Always Decline

| Suggestion | Reason |
|-----------|--------|
| "Use `next/link` directly" | Must use `Link` from `@i18n/routing` |
| "Add types inline in component" | All types must go in `/types` directory |
| "Use `gray-500` for text" | Must use semantic tokens (`text-foreground/80`) |
| "Add searchParams to page component" | CRITICAL: causes $300+ cost spikes |
| "Use raw fetch()" | Must use `fetchWithHmac` or `safeFetch` |
| "Create barrel file / index.ts re-exports" | Causes manifest bloat in RSC |
| "Add `next: { revalidate }` to external fetch" | Causes fetch cache explosion |
| "Don't exit on missing auth in CI scripts" | CI scripts can't run without credentials |
| "Consolidate API queries with different filters" | Different queries need different params |
| "Use `@types/*` path alias" | Conflicts with TS type definition packages |

### Usually Decline (Cosmetic)

| Suggestion | Reason |
|-----------|--------|
| "Simplify working logic" | If it works correctly, cosmetic refactors add risk |
| "Use urlparse instead of string ops" | Fine when input is a controlled constant |
| "Split file into multiple modules" | Acceptable for CI scripts under ~1500 lines |
| "Use broader exception types" | Specific catches are intentional |
| "Add global variables" | CI scripts with module-level state are fine |

### CLS /100 Normalization (Known False Positive)

Gemini repeatedly flags CLS `/100` as incorrect. **Always decline this**:
- PSI API returns CLS percentile as INTEGER (e.g., 12 = CLS 0.12)
- Our thresholds check 0.1/0.25 after `/100` normalization
- This is CORRECT per PSI API documentation

## Efficiency Tips

- **Parallel reads**: Read all flagged code sections in one tool call
- **Batch edits**: Apply all fixes before committing
- **Single commit**: Group all fixes into one commit per round
- **Single resolve loop**: Resolve all thread IDs in one bash call
- **Count rounds**: Track which round this is (check PR comment history)

## Example Full Run

```
User: "check new comments"

Agent:
1. Fetches 4 unresolved threads
2. Presents table:
   | # | Source | Issue | Verdict |
   |---|--------|-------|---------|
   | 1 | Cubic L1355 | mkdir before write | ✅ Fix |
   | 2 | Cubic L100 | SystemExit (repeat) | ❌ Decline |
   | 3 | Gemini L215 | Consolidate queries | ❌ Decline |
   | 4 | Gemini L411 | urlparse vs replace | ❌ Decline |

3. Fixes #1, validates syntax
4. Commits: "fix(seo): ensure output dir exists"
5. Resolves all 4 threads
6. Comments with summary + re-review triggers
7. Reports: "Round 6: 1 fixed, 3 declined. All resolved."
```

## Checklist

- [ ] Set `export GH_PAGER=cat` before GraphQL calls
- [ ] Fetch ALL unresolved threads (not just new ones)
- [ ] Cross-reference `code-review-evaluation` skill for pattern/architecture suggestions
- [ ] Present summary table before making changes
- [ ] Validate syntax after fixes
- [ ] Handle `git push` rejection with `--rebase`
- [ ] Resolve ALL threads (fixed AND declined)
- [ ] Include round number in commit/comment
- [ ] Trigger all 3 review bots in re-review comment
