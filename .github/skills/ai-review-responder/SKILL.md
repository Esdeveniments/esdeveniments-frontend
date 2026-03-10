---
name: ai-review-responder
description: Automate responding to AI code review comments (Gemini, CodeRabbit, Cubic, Sentry) on PRs. Use when asked to "check comments", "check new suggestions", or "respond to AI reviews".
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
- Otherwise, detect from the current branch: `gh pr list --head "$(git branch --show-current)" --json number --jq '.[0].number'`
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

For each unresolved thread, use the `code-review-evaluation` skill's decision tree:

| Category | Default | Action |
|----------|---------|--------|
| Bug/error fix | AGREE ✅ | Fix it |
| Missing docs/fields | AGREE ✅ | Fix it |
| Unused code/imports | AGREE ✅ | Fix it |
| Extract constant / reduce duplication | AGREE ✅ | Fix it |
| Edge case handling (null check, mkdir, try/catch) | AGREE ✅ | Fix it |
| Performance improvement (batch API calls) | AGREE ✅ | Fix it |
| Pattern/architecture change | CHECK SKILLS | Cross-reference project skills |
| Cosmetic refactor (rename, reorder working code) | DECLINE ❌ | Resolve with rationale |
| Repeat of previously declined suggestion | DECLINE ❌ | Resolve, reference prior decision |
| Breaks functionality or project conventions | DECLINE ❌ | Resolve with explanation |

**For pattern/architecture suggestions**: Cross-reference the relevant project skill from `.github/skills/` before deciding. See the `code-review-evaluation` skill for the full decision tree.

### Step 4: Present Summary Table

Before making changes, present a summary table:

```
| # | Source | Line | Issue | Verdict |
|---|--------|------|-------|---------|
| 1 | Gemini L594 | Batch API calls | ✅ AGREE — reduces N calls to 1 |
| 2 | Cubic L88 | Don't exit on error | ❌ DECLINE — rationale here |
```

### Step 5: Apply Fixes

For agreed suggestions:
1. Read the relevant code sections (parallel reads for efficiency)
2. Make the minimal fix
3. Validate (syntax check, lint, typecheck as appropriate for the language)

Batch all fixes into a single commit:

```bash
git add <files>
git commit -m "fix: address AI review feedback (round N)

- [description of fix 1] (Source)
- [description of fix 2] (Source)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
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
cat <<'EOF' > /tmp/review-comment.md
Round N: [summary of fixes]. Declined: [summary with rationale].

@coderabbitai review
@gemini review
@cubic-dev-ai review
EOF
gh pr comment PR_NUMBER --body-file /tmp/review-comment.md
```

**Bot trigger commands**:
- CodeRabbit: `@coderabbitai review`
- Gemini: `@gemini review`
- Cubic: `@cubic-dev-ai review`

### Step 8: Report Results

Present a final summary table showing all actions taken.

## Evaluation Rules

### Always Agree (Most Cases)

AI reviewers are usually right about:
- Missing null checks, error handling, edge cases
- Unused imports/variables
- Documentation inconsistencies
- Type mismatches
- Extracting repeated values as constants
- Reducing API call count (batching)
- File encoding, trailing newlines
- Security vulnerabilities (generic patterns)

### Check Project Skills Before Deciding

Only when suggestion involves project-specific patterns. See `code-review-evaluation` skill for full list:
- Import patterns (`next/link` vs `@i18n/routing`)
- Type organization (`/types` directory governance)
- Styling (semantic tokens vs arbitrary Tailwind)
- API patterns (three-layer proxy, `fetchWithHmac`)
- URL/routing (`searchParams` restrictions)
- Environment variables (4-location rule)

### Common Decline Patterns

| Pattern | Typical Rationale |
|---------|------------------|
| Cosmetic refactor of working code | Adds risk without functional benefit |
| Consolidate queries with different filters | Different queries need different parameters |
| Replace string ops with stdlib for controlled inputs | Input is a constant we control |
| Split small scripts into modules | Acceptable for scripts under ~1500 lines |
| Don't exit on missing required config in CI | CI scripts can't produce useful output without config |
| Broader exception handling | Specific catches are intentional |
| Repeated suggestion (same as prior round) | Already evaluated and declined with rationale |

## Efficiency Tips

- **Parallel reads**: Read all flagged code sections in one tool call
- **Batch edits**: Apply all fixes before committing
- **Single commit**: Group all fixes into one commit per round
- **Single resolve loop**: Resolve all thread IDs in one bash call
- **Count rounds**: Track which round this is (check PR comment history)
- **Handle push conflicts**: Always `git pull --rebase` if push fails

## Example Full Run

```
User: "check new comments"

Agent:
1. Detects PR from current branch
2. Fetches 4 unresolved threads
3. Presents table:
   | # | Source | Issue | Verdict |
   |---|--------|-------|---------|
   | 1 | Cubic L200 | Add mkdir before write | ✅ Fix |
   | 2 | Cubic L50 | Don't exit on error | ❌ Decline — can't run without config |
   | 3 | Gemini L100 | Consolidate queries | ❌ Decline — different filters |
   | 4 | Gemini L300 | Use urlparse | ❌ Decline — input is constant |

4. Fixes #1, validates syntax
5. Commits and pushes
6. Resolves all 4 threads
7. Posts summary comment + triggers re-review bots
8. Reports: "Round N: 1 fixed, 3 declined. All resolved."
```

## Checklist

- [ ] Set `export GH_PAGER=cat` before GraphQL calls
- [ ] Fetch ALL unresolved threads (not just new ones)
- [ ] Cross-reference `code-review-evaluation` skill for pattern/architecture suggestions
- [ ] Present summary table before making changes
- [ ] Validate changes after fixes (syntax, lint, typecheck)
- [ ] Handle `git push` rejection with `--rebase`
- [ ] Resolve ALL threads (fixed AND declined)
- [ ] Include round number in commit and comment
- [ ] Trigger review bots using correct commands (`@gemini review`, not `/gemini review`)
