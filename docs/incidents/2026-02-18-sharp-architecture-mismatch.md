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

## Prevention Measures

### Already Implemented

1. **Guard test** (`test/sharp-architecture.test.ts`) — 6 tests validating:
   - Lambda architecture matches Sharp binary arch
   - `server.install` has correct platform binaries
   - No wrong-arch binaries present
   - `server.install` arch = `args.architecture`
   - `open-next.config.ts` exists and installs Sharp
   - `open-next.config.ts` arch matches Lambda architecture

2. **E2E smoke test** (`e2e/image-proxy.spec.ts`) — "Sharp module is installed and working" test:
   - Hits `/api/image-proxy` with a real image
   - Asserts `x-image-proxy-optimized` is NOT `fallback-sharp-error`
   - Provides actionable error message pointing to this incident doc

3. **Inline documentation** — Critical warnings in `open-next.config.ts`, `sst.config.ts`, and project instructions explaining why these files must not be deleted/misaligned

## Key Files

| File                                      | Role                                              |
| ----------------------------------------- | ------------------------------------------------- |
| `open-next.config.ts`                     | **PRIMARY** Sharp installer — MUST NOT be deleted |
| `sst.config.ts` `server.install`          | Redundant Sharp install (safety net)              |
| `sst.config.ts` `args.architecture`       | Lambda architecture — must match Sharp arch       |
| `next.config.js` `serverExternalPackages` | Tells Turbopack to keep Sharp external            |
| `test/sharp-architecture.test.ts`         | Guard test preventing config drift                |
| `e2e/image-proxy.spec.ts`                 | E2E test catching runtime Sharp failure           |

## Lessons Learned

1. **`open-next.config.ts` is NOT dead weight** — it's the actual Sharp installer for the Lambda bundle. SST's `server.install` alone is insufficient.
2. **Silent fallbacks hide outages** — The graceful error handling (200 + fallback) meant no alerts fired for 4 days. Always add E2E tests for critical optimizations.
3. **SST's cross-platform npm install is broken in 3.17.25** — Don't trust `server.install` to cross-install for a different arch than the CI host.
4. **Lambda ZIP inspection is the ground truth** — Download and `unzip -l` the actual deployed ZIP to verify what's really there, don't trust config files.
5. **HAR files catch silent degradations** — The user's HAR file was the only signal that something was wrong.
