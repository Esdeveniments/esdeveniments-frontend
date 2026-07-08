# Incident: Production Container Crash-Loop from Healthcheck Timeout (Jul 7, 2026)

## Summary

The production frontend container (`ohrtinmo1t8sz798wrq1gav3`) exhausted its
10-restart limit and was stopped by Coolify after the Docker HEALTHCHECK
failed 3 consecutive times across 10 restart cycles. No deploy had occurred
in the preceding 2 days — the crash was a spontaneous runtime event triggered
by the combination of **memory limits + low swappiness (10) + a 3-second
healthcheck timeout** that was never recalibrated after heap bounding was
introduced in commit `721731b3` (Jun 15, 2026).

The site was down for approximately 21 hours (Jul 7 ~14:00 UTC → Jul 8 ~11:13
UTC) until the owner manually triggered a redeploy from the Coolify dashboard.

This is the second prod crash in 3 weeks with the same root cause family — the
backend prod (`esdeveniments-back-pro`) also crashed on Jul 2 with
`swappiness=10`. Both prod containers were configured with low swappiness;
neither staging container (swappiness 20–60) has ever crash-looped.

## Impact

| | |
| --- | --- |
| Downtime | ~21 hours (Jul 7 14:00 → Jul 8 11:13 UTC) |
| User impact | Site completely unavailable (container stopped, not just degraded) |
| SEO impact | Crawlers received connection errors for ~21h; Google Search Console may flag |
| Monitoring | GitHub Actions uptime monitor (`.github/workflows/uptime.yml`) detected the outage starting Jul 7 15:49 UTC and sent email alerts |
| Recovery | Manual — owner clicked Restart in Coolify dashboard, which triggered a fresh deploy |

## Timeline

- **Jul 2, 2026** — **Precursor:** Backend prod (`esdeveniments-back-pro`, also `swappiness=10`) crashes once (`last_restart_type: crash`, 1 restart). Same root cause family — low swappiness + memory limits + tight healthcheck — but the backend recovered after a single restart (different healthcheck config or less memory pressure at that moment). This was the first signal that `swappiness=10` + bounded memory was dangerous.
- **Jul 5, 2026** — Last successful frontend deploy: commit `3e1d8bc8` ("fix(docker): clear zero-byte image cache files on boot"). Build passed, deploy confirmed, smoke tests green.
- **Jul 7, ~14:00 UTC** — Container begins crash-looping. Coolify records `last_restart_at: 2026-07-07T14:00:16Z`, `last_restart_type: crash`. The container hits 10/10 restarts and is stopped (`status: exited:unhealthy`).
- **Jul 7, 15:49 UTC** — GitHub Actions uptime monitor first detects the outage. Failures continue through the rest of Jul 7 and into Jul 8 (every 15-min check fails). Email alerts sent.
- **Jul 8, ~11:13 UTC** — Owner manually triggers a redeploy from the Coolify dashboard. New container starts clean, passes health checks, status returns to `running:healthy`.
- **Jul 8, 11:15 UTC** — Uptime monitor confirms site is back up.

## Root Cause

Three changes introduced around **June 15, 2026** (commit `721731b3`) combined
to make the existing 3-second healthcheck timeout lethal. The HEALTHCHECK
itself was never updated to account for the new memory regime.

### The inflection point: commit 721731b3 (Jun 15, 2026)

This commit (`fix(self-hosted): bound Next.js heap and stop Redis cache growth`)
introduced two new constraints, and a third was set in the Coolify dashboard
around the same time:

1. **Heap bounding via `docker-entrypoint.sh`** — Before this commit, the
   container ran `node server.js` directly with no heap cap. V8 defaulted to
   ~50% of the *host's* 8 GB, so GC pauses were short and the 3s healthcheck
   was never stressed. After the commit, the entrypoint reads the cgroup
   limit and caps `--max-old-space-size` to 75% of it — 75% of 2 GB ≈ 1536 MB.
   GC cycles in a smaller heap are more frequent and longer.

2. **Memory limits set in Coolify** — Around the same time, resource limits
   were configured in the Coolify dashboard (2 GB hard / 1 GB soft for prod
   frontend, 2 GB / 1.2 GB for prod backend). Before this, containers ran
   with no cgroup limits — V8 had the full host memory to work with.

3. **Low swappiness (10)** — The prod containers were configured with
   `swappiness=10`, which tells the kernel to aggressively reclaim memory
   from the process (triggering GC) rather than swapping to disk. This
   directly increases GC pressure and pause durations.

The HEALTHCHECK timeout (3s, unchanged since the Dockerfile was first created)
was correct for the *old* unconstrained regime but was never recalibrated for
the *new* memory-bounded one.

### The swappiness correlation is the smoking gun

| Application | Swappiness | Memory | Crashed? |
| --- | --- | --- | --- |
| Frontend prod | 10 | 2g | ✅ Jul 7 (crash-loop, 10 restarts) |
| Backend prod | 10 | 2g | ✅ Jul 2 (crash, 1 restart) |
| Staging frontend | 60 (Docker default) | 1g | ❌ Never |
| Staging backend | 20 | 1g | ❌ Never |
| Staging-old | 60 | 1g | ❌ Never (stopped manually) |

Both prod apps with `swappiness=10` crashed within 2–3 weeks of the limits
being set (backend Jul 2 = 17 days, frontend Jul 7 = 22 days after Jun 15).
Neither staging app — with higher swappiness (20–60) and lower memory limits —
has ever crash-looped. Lower swappiness means the kernel prefers triggering GC
over swapping, which directly lengthens the stop-the-world pauses that exceed
the 3s healthcheck timeout.

### The failure cascade

1. **Memory pressure peaks** — traffic spike, image optimization burst
   (sharp's off-heap allocation), or another container growing beyond its
   soft limit. The frontend's 2 GB cgroup is consumed by V8 heap (~1536 MB)
   + sharp off-heap + buffers + RSS.
2. **Kernel reclaims memory** — with swappiness=10, the kernel pressures V8
   to GC rather than swapping. V8 runs a stop-the-world major GC cycle.
3. **Event loop freezes** — during the major GC, the event loop is blocked.
   The `/api/health` endpoint (normally <100ms) can't respond within the 3s
   healthcheck timeout.
4. **Docker marks container unhealthy** — 3 consecutive failures (3s × 3
   retries ≈ 9s of sustained unresponsiveness).
5. **Coolify restarts → same pressure → same failure** — the new container
   boots into the same memory-constrained environment. 10 restarts exhausted.
   `status: exited:unhealthy`, `restart_count: 10`.

### Why it never happened before June 15

Before commit `721731b3`, there were no Coolify memory limits and no entrypoint
heap cap. V8 had access to the full 8 GB host memory, GC major cycles were rare
and short, and the 3s healthcheck timeout was always comfortably met. The
healthcheck timeout was correct for the *old* unconstrained regime but was
never recalibrated for the *new* memory-bounded one.

### Why no OOM-kill was recorded

The container was stopped by Coolify's restart-limit policy, not by a kernel
OOM-kill. The 3s healthcheck timeout was more aggressive than the cgroup
memory limit's own enforcement — healthcheck failure triggered restarts
*before* the kernel would have OOM-killed the process. This is worse than an
OOM-kill: it leaves no `dmesg` trail, looks like the app is simply broken, and
burns through the restart budget in ~18 minutes.

### Server memory budget (8 GB shared)

| Service | Memory Limit | Reservation | Swappiness |
| --- | --- | --- | --- |
| Frontend prod | 2 GB | 1 GB | 10 |
| Backend prod | 2 GB | 1.2 GB | 10 |
| Backend staging | 1 GB | 512 MB | 20 |
| Frontend staging | 1 GB | 0 | 60 |
| 4× Redis (pro + pre + 2 others) | ~1.5 GB | — | — |
| **Total committed** | **~7.5 GB** | | |
| Remaining for OS + Coolify + Traefik | **~0.5 GB** | | |

The box is effectively oversubscribed. Any container exceeding its soft limit
(reservation) pressures the others. The frontend prod's 1 GB reservation is
well below its 2 GB hard limit, so it can grow into the gap — but that gap is
shared with everything else on the box.

## Resolution

1. **Immediate (Jul 8)** — Owner manually redeployed from Coolify dashboard.
   New container started with a fresh writable layer and no accumulated memory,
   so it passed health checks immediately.

2. **Healthcheck timeout fix (this change)** — Increase the Dockerfile HEALTHCHECK
   timeout from 3s to 10s and the start-period from 20s to 40s:

   ```dockerfile
   # After (fixed)
   HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3
   ```

   - **10s timeout** gives V8's GC enough headroom to complete a stop-the-world
     cycle and still respond to the health probe. A GC pause under memory
     pressure can last 2–5s; 10s absorbs that with margin.
   - **40s start-period** covers cold-start: `docker-entrypoint.sh` reads the
     cgroup limit, sizes the heap, clears 0-byte image cache files (the `find
     .next/cache/images -type f -size 0 -delete` scan added in `3e1d8bc8`),
     then `node server.js` boots, connects to Redis, and runs the stale-cache
     purge. The previous 20s was marginal — a slow Redis connect, a large
     purge, or the 0-byte scan could exceed it, causing false-unhealthy on the
     very first boot.
   - **3 retries × 30s interval** unchanged — still 90s of sustained
     unresponsiveness before a restart is triggered, which is a reasonable
     signal that the process is genuinely stuck (not just a momentary GC pause).

## Prevention

1. **Healthcheck timeout calibrated for GC** — 10s timeout absorbs V8
   stop-the-world pauses under memory pressure. The healthcheck should detect
   a genuinely dead process, not a temporarily slow one.

2. **Start-period calibrated for cold-start** — 40s covers the full boot
   sequence (entrypoint → heap sizing → cache cleanup → Node boot → Redis
   connect → stale-cache purge) without false-unhealthy on first boot.

3. **Raise prod swappiness from 10 to 20–30** — Both prod containers crashed
   at `swappiness=10`; neither staging container (20–60) has ever crashed.
   Swappiness=10 forces the kernel to pressure V8 into GC rather than swapping,
   directly increasing stop-the-world pause frequency and duration. Raising to
   20–30 gives the kernel swap headroom and reduces GC pause frequency, at the
   cost of some swap I/O under pressure. This is the highest-leverage Coolify
   dashboard change to prevent recurrence.

4. **Uptime monitor confirmed working** — The GitHub Actions uptime monitor
   (`.github/workflows/uptime.yml`, every 15 min) detected the outage within
   ~1.5 hours and sent email alerts. This is the detection layer that worked;
   the gap was in response time (manual intervention required).

5. **Pending — reduce server memory pressure** — The 8 GB box is
   oversubscribed at ~7.5 GB of committed limits. Offloading staging to a
   separate server would free ~2 GB of headroom. See
   `docs/self-hosted-resource-limits.md` and the follow-up note in
   `docs/ci-build-push-migration.md`.

6. **Pending — Sentinel metrics review** — Coolify's Sentinel (enabled, 7-day
   history, 10s refresh) captures server-level CPU/memory metrics that would
   show the memory pressure curve leading up to the crash. These are visible
   in the Coolify dashboard (Server → Metrics tab) but not exposed via the
   REST API. Review the Jul 7 13:00–14:00 UTC window to confirm the root
   cause.

## Lessons Learned

1. **Adding memory constraints requires recalibrating healthcheck timeouts.**
   The 3s timeout was fine when V8 had the full 8 GB host to work with. Once
   heap bounding + cgroup limits + swappiness=10 were introduced, GC pauses
   grew longer, but the healthcheck was never updated. Any change that
   constrains memory — heap caps, cgroup limits, swappiness — must trigger a
   review of the healthcheck timeout.

2. **Low swappiness (10) amplifies GC pressure.** With swappiness=10, the
   kernel aggressively pressures V8 to GC instead of swapping. This is
   intentional for memory efficiency, but it directly increases the frequency
   and duration of stop-the-world pauses. Both prod containers (swappiness=10)
   crashed; neither staging container (swappiness 20–60) did. Consider raising
   prod swappiness to 20–30 to give the kernel more swap headroom and reduce
   GC pause frequency.

3. **Healthcheck-induced crash loops are worse than OOM-kills.** A kernel
   OOM-kill leaves a clear `dmesg` trail and a single restart. A healthcheck
   crash-loop burns through the restart budget (10× in ~18 minutes) and leaves
   no kernel-level evidence — the container just looks "unhealthy" with no
   obvious cause. The 3s timeout effectively made the healthcheck more
   aggressive than the cgroup memory limit's own enforcement.

4. **The uptime monitor caught it, but recovery was manual.** Detection worked
   (email alerts within ~1.5h). The gap was that nothing automatically
   restarted the container after Coolify gave up. Consider a webhook or
   scheduled job that checks the Coolify API status and triggers a redeploy
   if the container is `exited:unhealthy`.

5. **No deploy was involved — spontaneous crashes need monitoring too.** The
   last deploy was 2 days prior and passed all CI gates. The crash was a
   runtime event (memory pressure), not a deploy regression. CI quality gates
   don't catch this class of failure — only runtime monitoring and sensible
   healthcheck configuration do.

6. **The server's memory budget leaves no room for bursts.** ~7.5 GB committed
   on an 8 GB box means any container exceeding its soft limit pressures all
   others. Moving staging off the prod box is the highest-impact prevention
   step.
