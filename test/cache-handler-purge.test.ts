import { describe, it, expect } from "vitest";
// cache-handler.mjs is a plain JS module without bundled type declarations; the
// purge helper is exercised here for behavior, so an untyped import is fine.
// @ts-expect-error -- no type declarations shipped for this .mjs entry point
import { purgeStaleBuildCaches } from "../cache-handler.mjs";

/**
 * Minimal node-redis (v5) stand-in. Crucially it returns the SCAN cursor as a
 * STRING ("0" when done), mirroring the real client — a numeric cursor would
 * hide loop-termination bugs. It also ignores MATCH (returns every stored key)
 * so the production-side namespace guard is what must filter out foreign keys.
 */
function createFakeRedis(keys: string[], { pageSize = 2 } = {}) {
  const unlinked: string[] = [];
  return {
    unlinked,
    scan(cursor: number | string, _options?: { MATCH?: string; COUNT?: number }) {
      const start = Number(cursor);
      const page = keys.slice(start, start + pageSize);
      const next = start + pageSize >= keys.length ? "0" : String(start + pageSize);
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

  it("never touches keys outside the cache namespace (defense-in-depth)", async () => {
    const client = createFakeRedis([
      "next:cache:old:/",
      "session:abc123",
      "user:42:profile",
      "next:cache:new:/",
    ]);

    const removed = await purgeStaleBuildCaches({ client, keyPrefix: "next:cache:new:" });

    expect(removed).toBe(1);
    expect(client.unlinked).toEqual(["next:cache:old:/"]);
    expect(client.unlinked).not.toContain("session:abc123");
    expect(client.unlinked).not.toContain("user:42:profile");
  });

  it("paginates across multiple SCAN cursors and terminates on string '0'", async () => {
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
