import "server-only";
import { TIMEZONE_MADRID } from "@utils/constants";
import {
  cacheDecrClampZero,
  cacheGetCounter,
  cacheIncrWithTtl,
} from "@lib/cache/redis-client";
import type {
  PosterActiveLease,
  PosterAvailabilityState,
  PosterHighWaterEntry,
  PosterLeaseHandle,
  PosterQuotaAdmission,
  PosterQuotaCounterRecord,
} from "types/api/poster";

// Quota limits aligned to Google AI Studio Gemini free-tier ceilings
// (Flash 5 RPM/20 RPD + Flash-Lite 15 RPM/500 RPD).
const ATTEMPTS_MAX_PER_WINDOW = 20;
const ATTEMPTS_WINDOW_MS = 10 * 60 * 1000;
const ACCOUNT_SCANS_PER_DAY = 8;
const GLOBAL_SCANS_PER_MINUTE = 8;
const GLOBAL_SCANS_PER_DAY = 150;
const LEASE_TTL_MS = 60_000;
const SEQUENCE_RETENTION_MS = 5 * 60 * 1000;
const PRUNE_INTERVAL_MS = 60_000;

const globalStore = globalThis as unknown as {
  __posterQuotaMemory?: Map<string, PosterQuotaCounterRecord>;
  __posterActiveLeases?: Map<string, PosterActiveLease>;
  __posterHighWater?: Map<string, PosterHighWaterEntry>;
  __posterQuotaLastPrune?: number;
  __posterQuotaLock?: Promise<void>;
};

function getMemoryMap(): Map<string, PosterQuotaCounterRecord> {
  if (!globalStore.__posterQuotaMemory) {
    globalStore.__posterQuotaMemory = new Map();
  }
  return globalStore.__posterQuotaMemory;
}

function getLeaseMap(): Map<string, PosterActiveLease> {
  if (!globalStore.__posterActiveLeases) {
    globalStore.__posterActiveLeases = new Map();
  }
  return globalStore.__posterActiveLeases;
}

function getHighWaterMap(): Map<string, PosterHighWaterEntry> {
  if (!globalStore.__posterHighWater) {
    globalStore.__posterHighWater = new Map();
  }
  return globalStore.__posterHighWater;
}

/** Lazy periodic cleanup of expired entries so long-running containers stay bounded. */
function pruneExpiredStores(nowMs: number): void {
  const lastPrune = globalStore.__posterQuotaLastPrune ?? 0;
  if (nowMs - lastPrune < PRUNE_INTERVAL_MS) return;
  globalStore.__posterQuotaLastPrune = nowMs;

  for (const [key, entry] of getMemoryMap()) {
    if (entry.resetAt <= nowMs) getMemoryMap().delete(key);
  }
  for (const [key, entry] of getHighWaterMap()) {
    if (entry.expiresAt <= nowMs) getHighWaterMap().delete(key);
  }
  for (const [key, entry] of getLeaseMap()) {
    if (entry.expiresAt <= nowMs) getLeaseMap().delete(key);
  }
}

/** Serializes quota check/charge/rollback operations within the Node process. */
function withQuotaLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = globalStore.__posterQuotaLock ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  globalStore.__posterQuotaLock = previous.then(() => next);
  return previous.then(fn).finally(() => release());
}

function getMadridDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_MADRID,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function getSecondsUntilNextMadridMidnight(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE_MADRID,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const s = Number(parts.find((p) => p.type === "second")?.value ?? 0);
  return Math.max(60, 86_400 - (h * 3600 + m * 60 + s));
}

async function readCounter(
  key: string,
  nowMs: number,
): Promise<PosterQuotaCounterRecord | null> {
  pruneExpiredStores(nowMs);
  const redisCounter = await cacheGetCounter(key);
  if (redisCounter !== null) {
    if (redisCounter.count <= 0) return null;
    return {
      count: redisCounter.count,
      resetAt: nowMs + redisCounter.ttlSeconds * 1000,
    };
  }
  const memRecord = getMemoryMap().get(key);
  if (memRecord && memRecord.resetAt > nowMs) {
    return memRecord;
  }
  return null;
}

async function incrementCounter(
  key: string,
  windowMs: number,
  nowMs: number,
): Promise<PosterQuotaCounterRecord> {
  pruneExpiredStores(nowMs);
  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const redisResult = await cacheIncrWithTtl(key, ttlSeconds);
  if (redisResult !== null) {
    const record: PosterQuotaCounterRecord = {
      count: redisResult.count,
      resetAt: nowMs + redisResult.ttlSeconds * 1000,
    };
    getMemoryMap().set(key, record);
    return record;
  }

  const existing = getMemoryMap().get(key);
  const next: PosterQuotaCounterRecord =
    existing && existing.resetAt > nowMs
      ? { count: existing.count + 1, resetAt: existing.resetAt }
      : { count: 1, resetAt: nowMs + windowMs };
  getMemoryMap().set(key, next);
  return next;
}

async function decrementCounter(key: string, nowMs: number): Promise<void> {
  const decrementedRedis = await cacheDecrClampZero(key);
  const existing = getMemoryMap().get(key);
  if (existing && existing.resetAt > nowMs && existing.count > 0) {
    getMemoryMap().set(key, {
      count: existing.count - 1,
      resetAt: existing.resetAt,
    });
  } else if (!decrementedRedis) {
    getMemoryMap().delete(key);
  }
}

function accountDayKey(accountId: string, day: string): string {
  return `poster:scan:acct:${accountId}:${day}`;
}

function globalDayKey(day: string): string {
  return `poster:scan:global:${day}`;
}

function globalMinuteKey(): string {
  return "poster:scan:global:rpm";
}

function accountAttemptKey(accountId: string): string {
  return `poster:attempt:acct:${accountId}`;
}

/**
 * Read-only availability check used by `GET /api/events/extract-poster`.
 * Never increments or reserves quota.
 */
export async function checkPosterQuotaAvailability(
  accountId: string | null,
  now = new Date(),
): Promise<{ state: PosterAvailabilityState; retryAfterSec?: number }> {
  const nowMs = now.getTime();
  const day = getMadridDayKey(now);

  const globalDay = await readCounter(globalDayKey(day), nowMs);
  if (globalDay && globalDay.count >= GLOBAL_SCANS_PER_DAY) {
    return {
      state: "app_limit",
      retryAfterSec: Math.max(1, Math.ceil((globalDay.resetAt - nowMs) / 1000)),
    };
  }

  const globalMin = await readCounter(globalMinuteKey(), nowMs);
  if (globalMin && globalMin.count >= GLOBAL_SCANS_PER_MINUTE) {
    return {
      state: "app_limit",
      retryAfterSec: Math.max(1, Math.ceil((globalMin.resetAt - nowMs) / 1000)),
    };
  }

  if (accountId) {
    const acctDay = await readCounter(accountDayKey(accountId, day), nowMs);
    if (acctDay && acctDay.count >= ACCOUNT_SCANS_PER_DAY) {
      return {
        state: "account_limit",
        retryAfterSec: Math.max(1, Math.ceil((acctDay.resetAt - nowMs) / 1000)),
      };
    }
  }

  return { state: "available" };
}

/**
 * Pre-dispatch upload attempt meter: bounds every authenticated POST (even
 * corrupt/invalid uploads) at 20 requests / 10 min per account.
 */
export function checkUploadAttemptLimit(
  accountId: string,
  now = new Date(),
): Promise<PosterQuotaAdmission> {
  return withQuotaLock(async () => {
    const nowMs = now.getTime();
    const record = await incrementCounter(
      accountAttemptKey(accountId),
      ATTEMPTS_WINDOW_MS,
      nowMs,
    );
    if (record.count > ATTEMPTS_MAX_PER_WINDOW) {
      return {
        allowed: false,
        reason: "attempt_limit",
        retryAfterSec: Math.max(1, Math.ceil((record.resetAt - nowMs) / 1000)),
      };
    }
    return { allowed: true };
  });
}

/**
 * Atomically charges a scan dispatch against per-account daily, global
 * per-minute, and global daily budgets. Uses Redis atomic INCR/DECR when Redis
 * is available and serializes in-process fallback access. Returns `chargedDay`
 * so midnight-crossing refunds decrement the exact day that was charged.
 */
export function chargePosterScan(
  accountId: string,
  now = new Date(),
): Promise<PosterQuotaAdmission> {
  return withQuotaLock(async () => {
    const nowMs = now.getTime();
    const day = getMadridDayKey(now);
    const dayWindowMs = getSecondsUntilNextMadridMidnight(now) * 1000;

    const globalDay = await incrementCounter(globalDayKey(day), dayWindowMs, nowMs);
    if (globalDay.count > GLOBAL_SCANS_PER_DAY) {
      await decrementCounter(globalDayKey(day), nowMs);
      return {
        allowed: false,
        reason: "app_limit",
        retryAfterSec: Math.max(1, Math.ceil((globalDay.resetAt - nowMs) / 1000)),
      };
    }

    const globalMin = await incrementCounter(globalMinuteKey(), 60_000, nowMs);
    if (globalMin.count > GLOBAL_SCANS_PER_MINUTE) {
      await decrementCounter(globalMinuteKey(), nowMs);
      await decrementCounter(globalDayKey(day), nowMs);
      return {
        allowed: false,
        reason: "app_limit",
        retryAfterSec: Math.max(1, Math.ceil((globalMin.resetAt - nowMs) / 1000)),
      };
    }

    const acctDay = await incrementCounter(
      accountDayKey(accountId, day),
      dayWindowMs,
      nowMs,
    );
    if (acctDay.count > ACCOUNT_SCANS_PER_DAY) {
      await decrementCounter(accountDayKey(accountId, day), nowMs);
      await decrementCounter(globalMinuteKey(), nowMs);
      await decrementCounter(globalDayKey(day), nowMs);
      return {
        allowed: false,
        reason: "account_limit",
        retryAfterSec: Math.max(1, Math.ceil((acctDay.resetAt - nowMs) / 1000)),
      };
    }

    return { allowed: true, chargedDay: day };
  });
}

/** Refunds the per-account daily charge against the exact day that was charged. */
export function refundAccountPosterScan(
  accountId: string,
  chargedDay?: string,
  now = new Date(),
): Promise<void> {
  return withQuotaLock(async () => {
    const nowMs = now.getTime();
    const day = chargedDay ?? getMadridDayKey(now);
    await decrementCounter(accountDayKey(accountId, day), nowMs);
  });
}

/**
 * Acquires the single active scan lease for `accountId`, ordering by client
 * selection `sequence` scoped to `clientId` (high-water mark per mount/tab).
 * A delayed older selection from the same client is rejected (`null`); a scan
 * from a new page load or another tab (`clientId`) is never rejected by an
 * earlier session's sequence, while still preempting any active scan lease for
 * the same account. Leases auto-expire after 60s so a crash never locks out.
 */
export function acquireAccountScanLease(
  accountId: string,
  sequence: number,
  clientId = "default",
  nowMs = Date.now(),
): PosterLeaseHandle | null {
  pruneExpiredStores(nowMs);
  const leases = getLeaseMap();
  const highWater = getHighWaterMap();
  const markKey = `${accountId}:${clientId}`;

  const existingMark = highWater.get(markKey);
  if (existingMark && existingMark.expiresAt > nowMs && sequence < existingMark.sequence) {
    return null;
  }

  const existingLease = leases.get(accountId);
  if (existingLease) {
    if (existingLease.expiresAt > nowMs) {
      existingLease.controller.abort();
    }
    leases.delete(accountId);
  }

  const controller = new AbortController();
  const lease: PosterActiveLease = {
    accountId,
    sequence,
    controller,
    expiresAt: nowMs + LEASE_TTL_MS,
  };
  leases.set(accountId, lease);
  highWater.set(markKey, {
    sequence,
    expiresAt: nowMs + SEQUENCE_RETENTION_MS,
  });

  return {
    accountId,
    sequence,
    signal: controller.signal,
    release: () => {
      if (leases.get(accountId) === lease) {
        leases.delete(accountId);
      }
    },
  };
}

/** Test-only reset for in-memory quota/lease state. */
export function resetPosterQuotaStateForTests(): void {
  globalStore.__posterQuotaMemory?.clear();
  globalStore.__posterActiveLeases?.clear();
  globalStore.__posterHighWater?.clear();
  globalStore.__posterQuotaLastPrune = 0;
  globalStore.__posterQuotaLock = undefined;
}
