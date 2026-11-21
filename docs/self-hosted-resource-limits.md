# Self-hosted resource limits (Coolify)

The production stack runs on a single 8 GB Hetzner box managed by Coolify, sharing
RAM across: frontend (prod + staging), two backend apps, two Postgres, four Redis,
Coolify itself, and the Traefik proxy. One unbounded container can starve the rest.

This note covers the **Next.js frontend** side. Container CPU/memory caps and Redis
`maxmemory` live in Coolify (infra), documented here so the two stay in sync.

## What the frontend actually does with memory

- Node/V8 does **not** return freed heap to the OS when traffic drops. RSS stays at
  its high-water mark until the process restarts — so the container never "idles
  back down" on its own. That's expected, not a leak.
- `sharp` (image optimization) allocates **off-heap** native memory that still
  counts against the cgroup limit. Leave headroom for it on top of the V8 heap.
- The in-process LRU cache (`cache-handler.mjs`) is bounded to 50 MB total.
- The `"use cache"` store (`use-cache-handler.mjs`, in-process LRU) is bounded
  to 64 MB.
- The optimized-image disk cache is capped at 2 GB (`next.config.js`,
  `images.maximumDiskCacheSize`) — disk, not RAM.

## Heap cap — handled in code (auto-adapts)

`docker-entrypoint.sh` reads the container's cgroup memory limit at boot and sets
`--max-old-space-size` to **75%** of it, so the GC runs before the kernel OOM-kills
the container. No rebuild is needed when the Coolify limit changes.

- Node's own default is ~50% of the limit; 75% uses the cap better while leaving
  room for `sharp` and buffers.
- We use an absolute MiB value, **not** Node's `=NN%` syntax — the percentage form
  reads the *host's* 8 GB, not the cgroup, and would oversize the heap on a shared
  box.
- Override per environment by setting `NODE_OPTIONS=--max-old-space-size=<MiB>` as a
  Coolify env var; the entrypoint leaves an explicit value untouched.

## Current limits (Coolify, 2026-11-21)

Server: one 8 GB, 4 vCPU box (`k0wkg8ggk44co48ss0gccw8c`, UTC). Sentinel metrics
on 2026-11-21: **5.25 GB / 8.13 GB RAM (~64.5%)**, **18.2 GB / 40.0 GB disk
(45.4%)**. Read with the Coolify MCP (`get_application` / `get_database` /
`get_service`, `limits_*` fields).

| Container | Memory limit | Reservation | Swappiness | CPU limit | CPU shares |
| --- | --- | --- | --- | --- | --- |
| Frontend prod (`esdeveniments-production`) | 2g | 1g | 20 | 2 | 1024 |
| Frontend staging (`esdeveniments-staging`) | 1g | 512m | 60 | 1 | 512 |
| Backend prod (`esdeveniments-backend-prod`) | 2g | 1g | 20 | 2 | 1024 |
| Backend pre (`esdeveniments-backend-pre`) | 1g | 512m | 20 | 1 | 512 |
| Postgres pro (`postgresql-database-pro`) | 2g | 1g | 0 | **1** | 1024 |
| Postgres pre (`postgresql-database-pre`) | 1g | 256m | 60 | 0.5 | 256 |
| Redis frontend pro (`maxmemory 450mb`) | 512m | 150m | 60 | 0.5 | 512 |
| Redis frontend staging (`maxmemory 200mb`) | 256m | 100m | 0 | 0.2 | 256 |
| Redis backend pro (`maxmemory 256mb`) | 512m | 150m | 0 | 0.5 | 512 |
| Redis backend pre (`maxmemory 128mb`) | 256m | 100m | 0 | 0.2 | 256 |
| Admin dashboard prod / pre (×2) | 384m each | 128m each | 60 | none | 256 |
| Sync worker (`cultural-agenda-sync`) | 768m | 64m | 60 | none | 128 |
| Logto pro / pre (services) | **none** | none | — | **none** | — |

- The admin dashboards (`Esdeveniments/esdeveniments-dashboard`, added
  2026-11-09) idle at ~47 MB each.
- `cultural-agenda-sync` (`Esdeveniments/cultural-agenda-sync`, moved off GitHub
  Actions on 2026-11-21) is an idle Alpine shell container (~1 MB RSS) that runs
  staggered Coolify Scheduled Tasks serialized via `flock` so only one Node sync
  runs at a time, with persistent `/app/data` storage.
- The capped containers add up to ~12.0 GB of limits (~5.1 GB of reservations),
  so limits overcommit while reservations stay inside the 8 GB host.
  Logto pro/pre still have no memory cap.

### Rules for a single shared box

- **Every container gets a memory limit.** Without one, when the host runs out
  of RAM the kernel OOM killer picks the biggest process, which can be Postgres
  or Coolify instead of the container that grew.
- **Size the limit from the measured peak + 30–50%** (Coolify → Metrics, or
  `docker stats` below). The sum of **reservations** must fit in real RAM minus
  ~1 GB for the OS, Coolify and Traefik; limits may overcommit a little.
- **Prefer CPU weight over hard CPU limits.** A hard limit throttles a container
  even when the box is idle; weight (`cpu_shares`) only decides who wins when
  the box is busy. Give prod 1024 and staging/pre 512.
- **Match the runtime to the limit:** the frontend entrypoint sizes the V8 heap
  (above); Java needs `-XX:MaxRAMPercentage=75` in `JAVA_TOOL_OPTIONS`.
- **Any limit change needs a redeploy**, and any memory squeeze needs a health
  check timeout review (incident
  [2026-07-07](./incidents/2026-07-07-coolify-container-healthcheck-crash.md)).

### Pending changes (in order)

1. Postgres pro: 2 CPUs (still at 1 CPU; may add to slow `/events/categorized`).
2. Logto pro / pre: 512m memory cap each.
3. Real fix: move staging and pre to a second small server.

*(Completed since 2026-11-04: Backend prod capped at 2g/1g/swappiness 20, Frontend
prod back to 2g, staging and pre CPU shares set to 512.)*

## What to set in Coolify (infra side)

Frontend application → **Resource Limits**:

- **Maximum Memory Limit (hard):** **2 GB** for prod (heap ≈ 1536 MB at 75%,
  the rest for `sharp`/buffers/RSS; live today). Staging is at 1 GB. The hard
  limit is what OOM-kills; pair it with a soft limit (reservation) below it.
- **CPU:** 1–2 vCPU is plenty for the current traffic.
- **Swappiness:** **avoid 10** — use **20–30** for prod (monitored hypothesis,
  not a confirmed fix). Both prod containers crashed at `swappiness=10`
  (frontend Jul 7, backend Jul 2, 2026); neither staging container
  (swappiness 20–60) has ever crash-looped. The theory is that the kernel
  aggressively pressured V8 into GC rather than swapping, producing
  stop-the-world pauses that exceeded the Docker healthcheck timeout — but
  this is a correlation from 2 data points, not something measured directly
  (no GC-pause metrics were captured). See incident
  [2026-07-07](./incidents/2026-07-07-coolify-container-healthcheck-crash.md#3-raise-prod-swappiness-from-10-to-2030-monitored-hypothesis)
  for the pending Sentinel metrics review that would confirm or rule this out.

Redis (`redis-pro`, `redis-pre`) → set a bound so a cache can't grow without limit:

- `maxmemory 450mb` (pro) / `200mb` (pre), read on 2026-11-06 from the authenticated
  `/api/health` (`cache.redis.maxmemoryBytes`); this doc said 256mb / 64mb before
- `maxmemory-policy allkeys-lru` — safe for a cache: an evicted entry is just
  regenerated on the next request.

## Redis growth from stale builds — handled in code

Cache keys are namespaced `next:cache:<buildId>:`. Static entries (no `revalidate`)
carry no TTL, so each deploy used to orphan the previous build's keys and Redis grew
forever. `cache-handler.mjs` now purges non-current-build keys on a fresh healthy
connection (SCAN + UNLINK, fire-and-forget). `maxmemory-policy allkeys-lru` above is
the backstop if a purge is ever skipped.

Until #669 (2026-11-06) the purge failed on every start (node-redis 6 rejects a
numeric `SCAN` cursor), so staging sat at 172 MB of 200 MB with 499 keys; the first
start with the fix left 4. Entries are also brotli-compressed since #669 (a route
shell is ~43 KB instead of ~390 KB). `/api/health` with the `x-health-secret` header reports `used_memory`,
`maxmemory`, evictions and hits under `cache.redis`.

## Quick check on the server

```sh
ssh root@<server> 'nproc; free -h; docker stats --no-stream \
  --format "{{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"'
```
