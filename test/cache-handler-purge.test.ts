import { describe, it, expect } from "vitest";
import { purgeStaleBuildCaches } from "../cache-handler.mjs";

/**
 * Minimal node-redis stand-in: paginates SCAN through `keys` and records every
 * UNLINK so we can assert exactly which keys were removed.
 */
function createFakeRedis(keys: string[], { pageSize = 2 } = {}) {
  const unlinked: string[] = [];
  return {
    unlinked,
    scan(cursor: number) {
      const start = cursor;
      const page = keys.slice(start, start + pageSize);
      const next = start + pageSize >= keys.length ? 0 : start + pageSize;
      return Promise.resolve({ cursor: next, keys: page });
    },
    unlink(arg: string | string[]) {
      const list = Array.isArray(arg) ? arg : [arg];
      unlinked.push(...list);
      return Promise.resolve(list.length);
    },
  };
}

describe("purgeStaleBuildCaches", () => {
  it("removes previous builds' keys and keeps the current build", async () => {
    const current = "next:cache:buildB:";
    const client = createFakeRedis([
      "next:cache:buildA:/",
      "next:cache:buildA:/events",
      "next:cache:buildB:/",
      "next:cache:buildB:/events",
      "next:cache:buildA:__sharedTags__",
    ]);

    const removed = await purgeStaleBuildCaches({ client, keyPrefix: current, scanCount: 2 });

    expect(removed).toBe(3);
    expect([...client.unlinked].sort()).toEqual(
      [
        "next:cache:buildA:/",
        "next:cache:buildA:/events",
        "next:cache:buildA:__sharedTags__",
      ].sort(),
    );
    expect(client.unlinked).not.toContain("next:cache:buildB:/");
  });

  it("paginates across multiple SCAN cursors", async () => {
    const client = createFakeRedis(
      Array.from({ length: 7 }, (_, i) => `next:cache:old:k${i}`),
      { pageSize: 2 },
    );

    const removed = await purgeStaleBuildCaches({ client, keyPrefix: "next:cache:new:" });

    expect(removed).toBe(7);
  });

  it("is a no-op when there is no build id (global prefix)", async () => {
    const client = createFakeRedis(["next:cache:buildA:/"]);

    const removed = await purgeStaleBuildCaches({ client, keyPrefix: "next:cache:" });

    expect(removed).toBe(0);
    expect(client.unlinked).toEqual([]);
  });

  it("returns 0 when keyPrefix is empty", async () => {
    const client = createFakeRedis(["next:cache:buildA:/"]);

    expect(await purgeStaleBuildCaches({ client, keyPrefix: "" })).toBe(0);
    expect(client.unlinked).toEqual([]);
  });
});
