// Store for "use cache" (next.config.js cacheHandlers.default).
// cacheMaxMemorySize: 0 (set for the Redis page cache) also turns Next's
// built-in "use cache" store into a no-op, so without this file nothing marked
// "use cache" was ever cached at runtime. @fortedigital/nextjs-cache-handler
// does not support "use cache" yet, so this is Next's own in-memory LRU.
// ponytail: per process and lost on deploy; move to a Redis-backed handler if
// we run more than one container.
import { createDefaultCacheHandler } from "next/dist/server/lib/cache-handlers/default.js";

export default createDefaultCacheHandler(64 * 1024 * 1024);
