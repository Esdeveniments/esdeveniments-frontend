import { describe, it, expect } from "vitest";
// @ts-expect-error -- no type declarations shipped for this .mjs entry point
import { compressedValueSerializer as serializer } from "../cache-handler.mjs";

const b64 = (text: string) => Buffer.from(text).toString("base64");

// Shape the Redis handler passes to the serializer: Buffers already base64.
const pageEntry = {
  lastModified: 1762420000000,
  lifespan: { expireAt: 1762423600, revalidate: 300 },
  tags: ["_N_T_/ca/barcelona"],
  value: {
    kind: "APP_PAGE",
    html: "<html>" + "<div>event</div>".repeat(500) + "</html>",
    rscData: b64("0:" + '["$","div",null,{}]'.repeat(500)),
    segmentData: { "/_tree": b64("tree".repeat(200)), "/_full": b64("full") },
    headers: { "x-next-cache-tags": "a,b" },
    postponed: "postponed-state",
    status: 200,
  },
};

describe("compressedValueSerializer", () => {
  it("round-trips a page entry and stores it compressed", () => {
    const stored = serializer.serialize(pageEntry);
    expect(stored.startsWith("br1:")).toBe(true);
    expect(stored.length).toBeLessThan(JSON.stringify(pageEntry).length / 5);
    expect(serializer.deserialize(stored)).toEqual(pageEntry);
  });

  it("does not change the entry it serializes", () => {
    const before = JSON.stringify(pageEntry);
    serializer.serialize(pageEntry);
    expect(JSON.stringify(pageEntry)).toBe(before);
  });

  it("round-trips route bodies, other kinds and empty values", () => {
    const route = {
      tags: [],
      lastModified: 1,
      value: { kind: "APP_ROUTE", body: b64('{"ok":true}'), status: 200, headers: {} },
    };
    const fetchEntry = {
      tags: ["events"],
      lastModified: 1,
      value: { kind: "FETCH", data: { body: "plain text", headers: {}, url: "u" } },
    };
    const empty = { tags: [], lastModified: 1, value: null };
    for (const entry of [route, fetchEntry, empty]) {
      expect(serializer.deserialize(serializer.serialize(entry))).toEqual(entry);
    }
  });

  it("still reads entries stored as plain JSON before compression", () => {
    expect(serializer.deserialize(JSON.stringify(pageEntry))).toEqual(pageEntry);
  });
});
