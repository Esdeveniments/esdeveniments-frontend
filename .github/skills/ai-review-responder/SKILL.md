---
name: ai-review-responder
description: Automate responding to AI code review comments (Gemini, CodeRabbit, Cubic, Greptile, Pullfrog, Sentry) on PRs. Use when asked to "check comments", "check new suggestions", or "respond to AI reviews".
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

Give each thread a verdict (AGREE / PARTIAL / DECLINE) using the `code-review-evaluation` skill: its default-verdict table and the list of project rules bots get wrong. Read the flagged code before deciding.

### Step 4: Present Summary Table

Before making changes, present a summary table:

```
| # | Source | Line | Issue | Verdict |
|---|--------|------|-------|---------|
| 1 | Gemini | L594 | Batch API calls | ✅ AGREE — reduces N calls to 1 |
| 2 | Cubic | L88 | Don't exit on error | ❌ DECLINE — rationale here |
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
- [ ] Evaluate each thread with the `code-review-evaluation` skill
- [ ] Present summary table before making changes
- [ ] Validate changes after fixes (syntax, lint, typecheck)
- [ ] Handle `git push` rejection with `--rebase`
- [ ] Resolve ALL threads (fixed AND declined)
- [ ] Include round number in commit and comment
- [ ] Trigger review bots using correct commands (`@gemini review`, not `/gemini review`)
