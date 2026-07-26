# 2026-07-26 — PR review-loop missed 12 of 13 threads on PR #426

## Summary
During round 1 + round 2 follow-ups on PR #426 (`feat/logto-auth-integration`),
the AI review loop declared the PR converged after handling a single Greptile
thread. A raw `gh api` query later surfaced **13 unresolved threads total** —
one handled in round 2 (Greptile L77) and **12 still open**, including two
P1 regressions in code that the same PR's round-1 commit had introduced:
the new proxy.ts multipart allowlist silently broke `/api/publica/image-upload`
+ `/api/sponsors/image-upload`, and the new `OwnerSummaryDTO` shape left the
11 frontend reads of `event.createdByUser` (incl. the api/events/[slug] auth
check) without a working alias.

## Impact
- **Functionality**: P1 regressions blocked event publish wizard and sponsor
  checkout image uploads *if the PR had been merged before round 3*.
- **Process**: One round of AI review feedback was effectively ignored because
  the GitHub API fetch window in round 2 returned before the late-arriving
  review threads had been written.
- **Cost**: ~30 min of human rework that could have been caught earlier with
  a stricter fetch pattern. No production impact (PR has been kept in draft
  throughout).

## Timeline
1. **Commit 7177b9c7 (round 1)** shipped the Logto onboarding integration
   (profile edit + avatar). The proxy.ts multipart allowlist was new, scoped
   to `/api/users/me/avatar` only.
2. **08:53:31 UTC** — CodeRabbit posted 3 unresolved threads (race wins on
   the proxy.ts allowlist earlier review; out of scope this round).
3. **10:01:48 UTC** — Greptile posted thread `PRRT_kwDOJUlaKM6T1z6s` on
   the avatar route's framing-layer guard (L77). This was the only thread
   fetched in round 2.
4. **10:12:05 UTC** — Cubic posted 11 P1/P2/P3 threads. Total: 13 open.
5. **Round 2 SHIP** — only thread 6 was treated. Eleven stayed open, of
   which 2 are P1 functional regressions.
6. **Round 3 (this incident)** — raw `gh api /nodes` re-fetch surfaced the
   full 13-thread picture; fixes applied in one aggregate commit.

## Root Cause
The round-2 GraphQL fetch used `gh api graphql … select(.isResolved == false)`
and the routing list of nodes was filtered to 1 hit at fetch time because the
remaining 12 threads had not yet landed from the bot review pipelines. The
"1 unresolved" output was correct *at that instant* but not representative
after another ~10 minutes of bot activity. The session declared convergence
based on the immediate-fetch result, not on the eventual-stable count.

## Resolution
- Aggregate commit `fix(round-3): AI review followups (+$N)` lands:
  - **P1 121G** — `proxy.ts` allowlist expanded to the 3 production
    multipart endpoints (`/api/users/me/avatar`, `/api/publica/image-upload`,
    `/api/sponsors/image-upload`).
  - **P1 121M** — `lib/api/events-external.ts` `fetchEventBySlug` now
    aliases `createdByUser ??= owner` after `parseEventDetail` so the 11
    frontend consumers (incl. `api/events/[slug]/route.ts:57` auth check)
    keep working when the backend drops the legacy field.
  - **P2 121V** — `contentLengthHeader > MAX_AVATAR_BYTES` relaxed to
    `> MAX_AVATAR_BYTES + 8192` with an inline comment about the multipart
    envelope byte budget.
  - **P2 121R** — New 403 propagation test in
    `test/api-users-me-profile.route.test.ts`.
  - **P2 121P** — Removed duplicate `ProfileUpdateInput` interface in
    `types/api/auth-validation.ts` (0 callers; canonical DTO already lives
    in `types/api/user.ts`).
  - **P3 121Z / 121a / 121c / 121f / 121i** — dead code, test descriptions,
    reserved-list test inputs, and the `||` vs `??` comment.
- 3 threads **declined** with grounded rationale (121O Rule 3 hallucination;
  121T magic-bytes defense in depth precedent absent in this stack;
  121W TS `import type` is compile-time benign, AGENTS.md silent on type-only
  cycles).
- Postmortem filed here (this file) + LESSONS.md gets a 1-line entry.

## Prevention
1. **Use GraphQL `totalCount` + paginated `first: 100`, not a single
   filtered list, when declaring convergence.** A `totalCount:` mismatch
   between two snapshots taken N minutes apart is the early-warning signal
   that more threads have arrived.
2. **Insert a `sleep ~4 min` between push and "convergence declaration"**
   that gives Copilot, CodeRabbit, Greptile, Cubic, and Gemini time to
   finish their incremental re-write. Re-fetch immediately before resolving
   anything.
3. **For each P1 / P2 / P3 thread encountered, decide AGREE / DECLINE and
   add a 1-line rationale to the PR summary comment so the rationale lives
   in the PR thread, not only in the agent memory.**
4. **Lint-style on the AI review loop itself**: every round that ends a
   push-triggered re-review must include `gh api graphql … reviewThreads
   .totalCount` in the closing report. `0 resolved` is not the same as
   `0 unresolved — 0 resolved == previous count`.

## Lessons Learned
- A single GraphQL filter call returning 1 hit is conclusive evidence of
  *1 open thread at fetch time*, not of *the final stable state*.
- Convergence requires **stable counts across two polls ≥ 4 min apart**,
  not a single poll.
- Re-fetching the PR comment thread before declaring the loop "wraps
  round N" is cheap insurance against the bot delay window.
