// @vitest-environment node
import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs script without types
import { citationsOf } from "../scripts/ai-visibility/run.mjs";

describe("citationsOf", () => {
  it("merges annotation and markdown URLs, dropping utm params and duplicates", () => {
    const message = {
      content:
        "Mira [esdeveniments.cat](https://www.esdeveniments.cat/maresme?utm_source=openai) i [x](https://other.cat/a).",
      annotations: [
        { type: "url_citation", url_citation: { url: "https://www.esdeveniments.cat/maresme?utm_source=openai" } },
        { type: "url_citation", url_citation: { url: "https://agenda.cat/b?id=1" } },
        { type: "file_citation" },
      ],
    };
    expect(citationsOf(message)).toEqual([
      "https://www.esdeveniments.cat/maresme",
      "https://agenda.cat/b?id=1",
      "https://other.cat/a",
    ]);
  });

  it("returns no citations for an empty message", () => {
    expect(citationsOf(undefined)).toEqual([]);
    expect(citationsOf({ content: "Sense enllaços" })).toEqual([]);
  });
});
