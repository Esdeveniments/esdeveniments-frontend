import { describe, it, expect } from "vitest";
import { parseRedisStats, parseRespReplies, respCommand } from "@utils/redis-resp";

const info =
  "# Memory\r\nused_memory:1710320\r\nused_memory_human:1.63M\r\nmaxmemory:268435456\r\nmaxmemory_policy:allkeys-lru\r\n" +
  "# Stats\r\nevicted_keys:12\r\nkeyspace_hits:900\r\nkeyspace_misses:100\r\n";

describe("parseRespReplies", () => {
  const response = Buffer.from(
    `+OK\r\n+PONG\r\n$${Buffer.byteLength(info)}\r\n${info}\r\n:42\r\n-NOAUTH x\r\n$-1\r\n`,
  );

  it("parses simple, bulk, integer, error and nil replies", () => {
    expect(parseRespReplies(response, 6)).toEqual(["OK", "PONG", info, 42, null, null]);
  });

  it("waits for a reply split across packets", () => {
    for (let cut = 0; cut < response.length; cut++) {
      expect(parseRespReplies(response.subarray(0, cut), 6)).toBeNull();
    }
  });

  it("counts bulk lengths in bytes, not characters", () => {
    const text = "plaça:1";
    const buf = Buffer.from(`$${Buffer.byteLength(text)}\r\n${text}\r\n`);
    expect(parseRespReplies(buf, 1)).toEqual([text]);
  });
});

describe("respCommand", () => {
  it("encodes arguments with spaces as bulk strings", () => {
    expect(respCommand("AUTH", "p w")).toBe("*2\r\n$4\r\nAUTH\r\n$3\r\np w\r\n");
  });
});

describe("parseRedisStats", () => {
  it("reads memory, policy, evictions and hits", () => {
    expect(parseRedisStats(info, 10)).toEqual({
      usedMemoryBytes: 1710320,
      maxmemoryBytes: 268435456,
      maxmemoryPolicy: "allkeys-lru",
      keys: 10,
      evictedKeys: 12,
      keyspaceHits: 900,
      keyspaceMisses: 100,
    });
  });
});
