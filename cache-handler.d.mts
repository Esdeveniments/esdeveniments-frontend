/** Minimal node-redis surface used by {@link purgeStaleBuildCaches}. */
interface RedisLike {
  scan(
    cursor: number,
    options?: { MATCH?: string; COUNT?: number },
  ): Promise<{ cursor: number; keys: string[] }>;
  unlink(keys: string | string[]): Promise<number>;
}

/**
 * Remove cache entries written by previous deploys (keys not under the current
 * build's `next:cache:<buildId>:` prefix). No-op without a build id.
 *
 * @returns count of keys removed
 */
export function purgeStaleBuildCaches(args: {
  client: RedisLike;
  keyPrefix: string;
  scanCount?: number;
}): Promise<number>;

declare const CacheHandler: unknown;
export default CacheHandler;
