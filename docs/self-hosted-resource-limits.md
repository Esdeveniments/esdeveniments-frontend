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

## What to set in Coolify (infra side)

Frontend application → **Resource Limits**:

- **Maximum Memory Limit (hard):** start at **1.5 GB** for prod (heap ≈ 1152 MB at
  75%, the rest for `sharp`/buffers/RSS). Staging can be lower (e.g. 768 MB–1 GB).
  The hard limit is what OOM-kills; pair it with a soft limit slightly below.
- **CPU:** 1–2 vCPU is plenty for the current traffic.

Redis (`redis-pro`, `redis-pre`) → set a bound so a cache can't grow without limit:

- `maxmemory 256mb` (pro) / `64mb` (pre)
- `maxmemory-policy allkeys-lru` — safe for a cache: an evicted entry is just
  regenerated on the next request.

## Redis growth from stale builds — handled in code

Cache keys are namespaced `next:cache:<buildId>:`. Static entries (no `revalidate`)
carry no TTL, so each deploy used to orphan the previous build's keys and Redis grew
forever. `cache-handler.mjs` now purges non-current-build keys on a fresh healthy
connection (SCAN + UNLINK, fire-and-forget). `maxmemory-policy allkeys-lru` above is
the backstop if a purge is ever skipped.

## Quick check on the server

```sh
ssh root@<server> 'nproc; free -h; docker stats --no-stream \
  --format "{{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"'
```
