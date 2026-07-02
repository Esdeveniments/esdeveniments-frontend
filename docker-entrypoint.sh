#!/bin/sh
# Size V8's old-space heap to a fraction of the container's memory limit so the
# garbage collector runs *before* the kernel OOM-kills the container.
#
# Why this exists:
#   - Node 22 is cgroup-aware and defaults the heap to ~50% of the container
#     limit, which underuses the cap. We bump that to 75%.
#   - We must use an ABSOLUTE MiB value, not Node's `=NN%` syntax: the percentage
#     form reads the *host's* memory, not the cgroup limit, so on a shared box it
#     would massively oversize the heap (Red Hat cgroups v2 guidance).
#   - Reading the live cgroup limit means this auto-adapts to whatever limit
#     Coolify is set to — no rebuild needed when the limit changes.
#
# Overridable: if NODE_OPTIONS already pins --max-old-space-size (e.g. set as a
# Coolify env var), we leave it untouched. If no memory limit is configured, we
# fall back to Node's own defaults.
set -e

HEAP_PERCENT=75

if [ -z "${NODE_OPTIONS:-}" ] || ! printf '%s' "$NODE_OPTIONS" | grep -q 'max-old-space-size'; then
  limit_bytes=""
  if [ -r /sys/fs/cgroup/memory.max ]; then
    # cgroups v2
    limit_bytes=$(cat /sys/fs/cgroup/memory.max)
  elif [ -r /sys/fs/cgroup/memory/memory.limit_in_bytes ]; then
    # cgroups v1
    limit_bytes=$(cat /sys/fs/cgroup/memory/memory.limit_in_bytes)
  fi

  # Reject non-numeric ("max" on v2) and unbounded sentinels (huge v1 value).
  case "$limit_bytes" in
    "" | *[!0-9]*) limit_bytes="" ;;
  esac

  # Treat anything above 64 GiB as "effectively no limit" → use Node defaults.
  if [ -n "$limit_bytes" ] && [ "$limit_bytes" -le 68719476736 ]; then
    # Convert to MiB before scaling so the intermediate stays small (no overflow
    # on 32-bit shells); sub-MiB precision loss is irrelevant for a heap size.
    # shellcheck disable=SC2017
    limit_mib=$(( limit_bytes / 1024 / 1024 ))
    heap_mb=$(( limit_mib * HEAP_PERCENT / 100 ))
    # Skip absurdly small caps where a forced heap would do more harm than good.
    if [ "$heap_mb" -ge 256 ]; then
      export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=${heap_mb}"
      echo "[entrypoint] cgroup limit detected; NODE_OPTIONS=$NODE_OPTIONS"
    fi
  fi
fi

# Delete any 0-byte files left in the Next.js image-optimizer disk cache.
#
# A killed write (OOM kill, forced restart) can leave a 0-byte file under
# .next/cache/images. On the next request that touches the disk cache,
# Next.js reads that file's size as 0 and feeds it to its internal LRUCache,
# which throws ("size must be > 0") and disables image caching for the rest
# of the process's life (every image gets re-optimized from scratch instead
# of served from cache). There is no volume mounted for .next/cache, so a
# plain container restart (as opposed to a fresh image pull) reuses the same
# writable layer and the leftover file re-triggers the bug immediately on
# boot. Upstream bug, unfixed as of Next.js 16.2.10 / 16.3.0-canary.75:
# https://github.com/vercel/next.js/issues/93757
find .next/cache/images -type f -size 0 -delete 2>/dev/null || true

exec node server.js
