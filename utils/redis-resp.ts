import type { RedisReply, RedisStats } from "types/cache";

/** A RESP array command; handles arguments with spaces or special chars. */
export function respCommand(...args: string[]): string {
  let cmd = `*${args.length}\r\n`;
  for (const arg of args) cmd += `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`;
  return cmd;
}

/**
 * Parses the first `count` replies (simple, error, integer, bulk string) from
 * a buffer that may hold a partial response. Returns null until all of them
 * have arrived.
 */
export function parseRespReplies(buf: Buffer, count: number): RedisReply[] | null {
  const replies: RedisReply[] = [];
  let pos = 0;
  while (replies.length < count) {
    const lineEnd = buf.indexOf("\r\n", pos);
    if (lineEnd === -1) return null;
    const type = String.fromCharCode(buf[pos]);
    const line = buf.toString("utf8", pos + 1, lineEnd);
    pos = lineEnd + 2;
    if (type === "$") {
      const length = Number(line);
      if (length < 0) {
        replies.push(null);
        continue;
      }
      if (buf.length < pos + length + 2) return null;
      replies.push(buf.toString("utf8", pos, pos + length));
      pos += length + 2;
    } else if (type === ":") replies.push(Number(line));
    else if (type === "-") replies.push(null);
    else replies.push(line);
  }
  return replies;
}

/** Picks the cache-relevant fields from `INFO memory` + `INFO stats` text. */
export function parseRedisStats(info: string, keys: number): RedisStats {
  const fields = new Map<string, string>();
  for (const line of info.split("\r\n")) {
    const sep = line.indexOf(":");
    if (sep > 0) fields.set(line.slice(0, sep), line.slice(sep + 1));
  }
  const num = (name: string) => Number(fields.get(name) ?? NaN);
  return {
    usedMemoryBytes: num("used_memory"),
    maxmemoryBytes: num("maxmemory"),
    maxmemoryPolicy: fields.get("maxmemory_policy") ?? "unknown",
    keys,
    evictedKeys: num("evicted_keys"),
    keyspaceHits: num("keyspace_hits"),
    keyspaceMisses: num("keyspace_misses"),
  };
}
