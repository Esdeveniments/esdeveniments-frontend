# Incident: Sharp Architecture Mismatch (Feb 18-22, 2026)

## Summary

A commit on Feb 18 changed the Lambda architecture from `x86_64` to `arm64` in `sst.config.ts` (commit `be155a87`). SST 3.17.25's Go binary doesn't pass `--arch=arm64` to `npm install`, so Sharp native binaries were always installed for x64 (matching the CI host). The arm64 Lambda couldn't load x64 Sharp binaries, causing `/api/image-proxy` to silently fall back to serving unoptimized images for 4 days.

A subsequent attempt to fix the issue deleted `open-next.config.ts`, which turned out to be the **actual** mechanism installing Sharp into the Lambda bundle (not `sst.config.ts` `server.install`). This made Sharp completely missing.

## Timeline

| Date      | Event                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| Feb 18    | Commit `be155a87`: Changed `args.architecture` from `x86_64` to `arm64` in sst.config.ts                      |
| Feb 18    | Deployed to production — Sharp starts returning `fallback-sharp-error` on every request                       |
| Feb 18-22 | All image-proxy requests serve unoptimized images (no alerts, error is caught gracefully)                     |
| Feb 22    | HAR analysis reveals `x-image-proxy-error: Could not load the 'sharp' module using the linux-arm64 runtime`   |
| Feb 22    | First fix attempt: deleted `open-next.config.ts` (thought to be dead weight) — makes Sharp completely missing |
| Feb 22    | Lambda ZIP inspection: only x64 Sharp binaries present despite arm64 config                                   |
| Feb 22    | Root cause confirmed: `open-next.config.ts` was the actual Sharp installer, not SST `server.install`          |
| Feb 22    | Fix deployed: restored `open-next.config.ts` + switched Lambda to x86_64 to match CI host arch                |
| Feb 22    | Confirmed working: `x-image-proxy-optimized: true`, 70-91% savings                                            |

## Impact

| Metric               | Normal                    | During Incident                                     |
| -------------------- | ------------------------- | --------------------------------------------------- |
| Image-proxy response | Optimized WebP (~5-15 KB) | Unoptimized original (~50 KB - 4.3 MB)              |
| Bandwidth per image  | ~10 KB avg                | ~500 KB avg (50x more)                              |
| Sharp processing     | Working                   | Silent fallback (200 OK, no error visible to users) |
| Duration             | —                         | ~4 days (Feb 18-22)                                 |

## Root Cause

### Why arm64 didn't work

SST 3.17.25's compiled Go binary (`pkg/runtime/node/build.go`) has code to pass `--arch=arm64 --cpu=arm64` to `npm install`, but the **compiled binary** doesn't execute this path correctly. The CI host (x64 Linux) determines which platform-specific optional dependencies npm resolves. Result: x64 Sharp binaries deployed to an arm64 Lambda.

### Why deleting open-next.config.ts broke everything

`open-next.config.ts` has its own `install.packages` + `arch` configuration that OpenNext uses to install Sharp into the Lambda bundle. This was the **primary** mechanism — not SST's `server.install`. Deleting the file removed Sharp entirely from the bundle (ZIP dropped from 28 MB to 20 MB).

### Why it was silent

The image-proxy route catches Sharp errors gracefully (returns 200 with unoptimized image + `x-image-proxy-error` header). No 5xx errors, no Sentry alerts for missing modules, no user-visible breakage — just degraded performance.

## Resolution

1. **Restored `open-next.config.ts`** with `arch: "x64"` — the actual Sharp installer
2. **Changed Lambda architecture** to `x86_64` to match CI host arch and Sharp binaries
3. **Updated `sst.config.ts`** `server.install` to x64 packages (redundant but consistent)
4. **Updated `package.json`** platform-specific deps to x64

### Post-Incident: arm64 Migration Attempt (Mar 2026, PR #236)

PR #236 ("perf: INP & TTFB improvements") attempted to switch to arm64 (Graviton2),
claiming OpenNext's `arch` field handles cross-arch installation. **This was wrong.**
The exact same failure occurred: Sharp arm64 binaries were NOT installed, Lambda ZIP
contained only a 24-byte stub. Production served unoptimized JPEGs (fallback-sharp-error)
from ~Mar 7 until caught Mar 13.

**What PR #236 changed (all reverted):**

1. `open-next.config.ts` arch `"x64"` → `"arm64"`
2. `sst.config.ts` architecture `"x86_64"` → `"arm64"`
3. Removed Sharp from `server.install` (claimed it was redundant)
4. `next.config.js` serverExternalPackages from x64 to arm64

**Why it failed again:** Neither OpenNext's `install.packages` nor SST v3's
`server.install` can cross-install arm64 Sharp binaries when CI runs on x64 Linux.
The `arch` field in open-next.config.ts does NOT actually work for cross-arch installation
despite documentation/comments claiming otherwise.

**Conclusion:** Do NOT attempt arm64 migration until SST or OpenNext PROVES cross-arch
npm install works (e.g., by using Docker buildx or npm's `--cpu`/`--os` flags correctly).
Verify by inspecting the Lambda ZIP (`unzip -l`) for actual Sharp binaries, not just config.

## Prevention Measures

### Already Implemented

1. **Guard test** (`test/sharp-architecture.test.ts`) — 6 tests validating:
   - Lambda architecture is x86_64
   - `server.install` has correct x64 Sharp binaries
   - No arm64 binaries present
   - `open-next.config.ts` exists and installs Sharp
   - `open-next.config.ts` arch matches Lambda architecture (x64)
   - `next.config.js` serverExternalPackages references x64 binaries

2. **E2E smoke test** (`e2e/image-proxy.spec.ts`) — "Sharp module is installed and working" test:
   - Hits `/api/image-proxy` with a real image
   - Asserts `x-image-proxy-optimized` is NOT `fallback-sharp-error`
   - Provides actionable error message pointing to this incident doc

3. **Inline documentation** — Critical warnings in `open-next.config.ts`, `sst.config.ts`, and project instructions explaining why these files must not be deleted/misaligned

## Key Files

| File                                      | Role                                                   |
| ----------------------------------------- | ------------------------------------------------------ |
| `open-next.config.ts`                     | **PRIMARY** Sharp installer — MUST NOT be deleted      |
| `sst.config.ts` `args.architecture`       | Lambda architecture (x86_64) — must match Sharp arch   |
| `sst.config.ts` `server.install`          | Safety net Sharp installer — must include x64 binaries |
| `next.config.js` `serverExternalPackages` | Tells Turbopack to keep Sharp external                 |
| `test/sharp-architecture.test.ts`         | Guard test preventing config drift                     |
| `e2e/image-proxy.spec.ts`                 | E2E test catching runtime Sharp failure                |

## Lessons Learned

1. **`open-next.config.ts` is NOT dead weight** — it's the actual Sharp installer for the Lambda bundle. SST's `server.install` is kept as a safety net but open-next.config.ts is the primary mechanism.
2. **Silent fallbacks hide outages** — The graceful error handling (200 + fallback) meant no alerts fired for 4 days. Always add E2E tests for critical optimizations.
3. **SST v3 + OpenNext cross-platform npm install is broken** — Don't trust EITHER `server.install` OR `open-next.config.ts` to cross-install for a different arch than the CI host. Use x86_64 to match CI.
4. **Lambda ZIP inspection is the ground truth** — Download and `unzip -l` the actual deployed ZIP to verify what's really there, don't trust config files.
5. **HAR files catch silent degradations** — The user's HAR file was the only signal that something was wrong.
6. **Do NOT trust AI claims about cross-arch compatibility** — PR #236 (Mar 2026) was explicitly told arm64 would work. It didn't. Always verify by inspecting the actual Lambda ZIP after a test deploy.
